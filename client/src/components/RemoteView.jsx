import { useEffect, useRef, useCallback, useState } from 'react';
import TopToolbar from './TopToolbar';
import { GestureHandler } from '../lib/gestureHandler';
import MobileFAB from './MobileFAB';
import MobileStatsOverlay from './MobileStatsOverlay';
import MobileQuickSettings from './MobileQuickSettings';
import MobileContextMenu from './MobileContextMenu';
import PerformanceOverlay from './PerformanceOverlay';
import { getStatsMonitor, qualityFromRtt } from '../lib/statsMonitor';

// Labels older agents understand (they ignore the newer `quality_preset` message).
const LEGACY_PRESET_LABEL = { performance: '480p30', balanced: '720p30', quality: '1080p30' };

/**
 * RemoteView — Renders the live remote desktop stream.
 *
 * RENDERING MODES:
 *   1. WebRTC mode  — <video> element receives a MediaStream directly.
 *      The browser's internal video pipeline handles decode + GPU composite.
 *
 *   2. Relay mode   — JPEG frames arrive via WebSocket relay.
 *      We decode them in a Web Worker (frameWorker) using createImageBitmap()
 *      and paint the resulting ImageBitmap onto an OffscreenCanvas-backed
 *      <canvas> element using ctx.drawImage(). This is GPU-composited,
 *      zero-copy, and runs entirely off the React reconciler's critical path.
 *
 * KEY DECISIONS:
 *   - NO setRelayFrame() state update. React state updates trigger reconciliation
 *     which costs 8–15 ms per frame — unacceptable at 20 FPS relay.
 *   - Worker queue depth capped at 2; stale frames are dropped before decode.
 *   - Frame deadline: frames older than 50 ms at decode time are discarded.
 *   - Mouse movement is coalesced by lib/inputSender.js (newest position per frame, unreliable channel);
 *     clicks and keys go on the reliable ordered channel and are never dropped.
 *   - ONE shared stats poll (lib/statsMonitor.js) feeds the overlay, toolbar and network badge.
 *   - bundlePolicy: 'max-bundle' is configured upstream in App.jsx.
 */

export default function RemoteView({ stream, peerConnection, onDisconnect, relayMode, isControlPaused, sendInputEvent, inputSender, socket, sessionId }) {
    // ── Refs ─────────────────────────────────────────────────────────────────
    const videoRef     = useRef(null);
    const canvasRef    = useRef(null);  // relay rendering target
    const containerRef = useRef(null);
    const workerRef    = useRef(null);  // frameWorker instance
    const frameIdRef   = useRef(0);     // monotonic frame ID for worker correlation

    // ── Mobile State ──────────────────────────────────────────────────────────
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showQuickSettings, setShowQuickSettings] = useState(false);
    const [batteryLevel, setBatteryLevel] = useState(100);
    const [networkQuality, setNetworkQuality] = useState('good');
    const [contextMenuState, setContextMenuState] = useState({ isOpen: false, x: 0, y: 0 });
    const gestureHandlerRef = useRef(null);

    // Performance overlay (off by default; ?perf=1 or the toolbar button turns it on) and stream quality preset.
    const [perfVisible, setPerfVisible] = useState(() => {
        try {
            return new URLSearchParams(window.location.search).get('perf') === '1' || localStorage.getItem('chameleon_perf_overlay') === '1';
        } catch { return false; }
    });
    const [qualityPreset, setQualityPreset] = useState(() => {
        try { return localStorage.getItem('chameleon_quality_preset') || 'balanced'; } catch { return 'balanced'; }
    });
    const togglePerf = useCallback(() => {
        setPerfVisible((on) => {
            try { localStorage.setItem('chameleon_perf_overlay', on ? '0' : '1'); } catch { /* storage blocked */ }
            return !on;
        });
    }, []);
    const handleQualityPreset = useCallback((preset) => {
        try { localStorage.setItem('chameleon_quality_preset', preset); } catch { /* storage blocked */ }
        setQualityPreset(preset);
        if (!sendInputEvent) return;
        sendInputEvent({ type: 'quality_preset', preset });
        sendInputEvent({ type: 'update_resolution', resolution: LEGACY_PRESET_LABEL[preset] }); // agents that predate presets
    }, [sendInputEvent]);

    // ── Fullscreen & Orientation ──────────────────────────────────────────────
    const toggleFullscreen = useCallback(async () => {
        if (!isFullscreen) {
            try {
                if (containerRef.current?.requestFullscreen) {
                    await containerRef.current.requestFullscreen();
                } else if (containerRef.current?.webkitRequestFullscreen) {
                    await containerRef.current.webkitRequestFullscreen();
                }
                setIsFullscreen(true);
            } catch (err) {
                console.error('Fullscreen error:', err);
            }
        } else {
            try {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    await document.webkitExitFullscreen();
                }
                setIsFullscreen(false);
            } catch (err) {
                console.error('Exit fullscreen error:', err);
            }
        }
    }, [isFullscreen]);

    useEffect(() => {
        const handleOrientationChange = () => {
            const isLandscape = window.innerHeight < window.innerWidth;
            if (isLandscape && !isFullscreen) {
                toggleFullscreen();
            }
        };
        window.addEventListener('orientationchange', handleOrientationChange);
        
        // Also listen to standard fullscreen change events
        const handleFullscreenChange = () => {
            setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        
        return () => {
            window.removeEventListener('orientationchange', handleOrientationChange);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, [isFullscreen, toggleFullscreen]);

    // ── Battery & Network Quality ──────────────────────────────────────────────
    useEffect(() => {
        const initBattery = async () => {
            try {
                const battery = await navigator.getBattery?.();
                if (battery) {
                    setBatteryLevel(Math.round(battery.level * 100));
                    battery.addEventListener('levelchange', () => {
                        setBatteryLevel(Math.round(battery.level * 100));
                    });
                }
            } catch (e) {
                // Battery API not available
            }
        };
        initBattery();
    }, []);

    useEffect(() => {
        if (!peerConnection) return undefined;
        // Shared once-per-second poll; state only changes when the badge bucket changes (no per-second re-render).
        return getStatsMonitor(peerConnection).subscribe((m) => {
            const quality = qualityFromRtt(m.rttMs);
            setNetworkQuality((previous) => (previous === quality ? previous : quality));
        });
    }, [peerConnection]);

    // ── Mobile Clipboard Handlers ──────────────────────────────────────────────
    const handlePushClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            sendInputEvent({ type: 'clipboard_push', text });
        } catch (err) {
            console.error("Failed to read clipboard:", err);
        }
    };

    const handlePullClipboard = () => {
        sendInputEvent({ type: 'clipboard_pull_request' });
    };

    // ── Pointer position calculator ───────────────────────────────────────────
    const getPointerPosition = useCallback((e) => {
        const target = relayMode ? canvasRef.current : videoRef.current;
        if (!target) return null;

        const rect         = target.getBoundingClientRect();
        const contentWidth  = relayMode ? target.width  : target.videoWidth;
        const contentHeight = relayMode ? target.height : target.videoHeight;
        if (!contentWidth || !contentHeight) return null;

        const cAR = contentWidth  / contentHeight;
        const rAR = rect.width    / rect.height;
        let rW = rect.width, rH = rect.height, oL = 0, oT = 0;

        if (cAR > rAR) { rH = rect.width  / cAR; oT = (rect.height - rH) / 2; }
        else            { rW = rect.height * cAR; oL = (rect.width  - rW) / 2; }

        return {
            x: Math.max(0, Math.min(1, (e.clientX - rect.left - oL) / rW)),
            y: Math.max(0, Math.min(1, (e.clientY - rect.top  - oT) / rH)),
        };
    }, [relayMode]);

    // ── Gesture Handler ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current) return;
        
        gestureHandlerRef.current = new GestureHandler(containerRef.current, {
            onDoubleTap: () => toggleFullscreen(),
            onLongPress: (e) => {
                const target = relayMode ? canvasRef.current : videoRef.current;
                if (!target) return;
                
                const rect = target.getBoundingClientRect();
                const pos = getPointerPosition({ clientX: e.x, clientY: e.y, target });
                if (!pos) return;
                
                // Send right click
                if (sendInputEvent) {
                    sendInputEvent({ type: 'mouse_down', button: 2, x: pos.x, y: pos.y });
                    sendInputEvent({ type: 'mouse_up', button: 2, x: pos.x, y: pos.y });
                }
                
                // Show action sheet
                setContextMenuState({ isOpen: true, x: e.x, y: e.y });
            },
            onSwipeDown: () => {
                setShowQuickSettings(true);
            },
            onPinch: (e) => {
                // Local zoom only
                const target = relayMode ? canvasRef.current : videoRef.current;
                if (target) {
                    const clampedScale = Math.max(1, Math.min(3, e.scale));
                    target.style.transform = `scale(${clampedScale})`;
                }
            }
        });

        return () => gestureHandlerRef.current?.destroy();
    }, [relayMode, getPointerPosition, sendInputEvent, toggleFullscreen]);

    // ── WebRTC video setup ────────────────────────────────────────────────────
    useEffect(() => {
        if (!relayMode && videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.warn('[Video] Autoplay blocked:', e));
            containerRef.current?.focus();
        }
    }, [stream, relayMode]);

    // ── Relay: Worker + OffscreenCanvas pipeline ──────────────────────────────
    useEffect(() => {
        if (!relayMode || !socket) return;

        // ── Spin up the frame decode worker ──────────────────────────────────
        // Vite exposes workers via `?worker` query or new URL(..., import.meta.url).
        // We use the URL form for maximum compatibility.
        const worker = new Worker(
            new URL('../workers/frameWorker.js', import.meta.url),
            { type: 'module' }
        );
        workerRef.current = worker;

        // ── Resolve the canvas 2D context ─────────────────────────────────────
        // We paint synchronously in the worker reply handler — no React state involved.
        const canvas = canvasRef.current;
        const ctx    = canvas ? canvas.getContext('2d', {
            alpha: false,          // opaque canvas = faster composite
            desynchronized: true,  // hint: don't sync with DOM paint (lower latency)
        }) : null;

        // Map of frameId → { timestamp } for deadline checking on the main thread
        const pendingFrames = new Map();

        // ── Worker reply: paint or discard ────────────────────────────────────
        worker.onmessage = (event) => {
            const { id, bitmap, dropped } = event.data;
            pendingFrames.delete(id);

            if (dropped || !bitmap || !ctx || !canvas) {
                // bitmap was already closed inside the worker; nothing to do
                return;
            }

            // ── FRAME DEADLINE (main-thread re-check) ─────────────────────
            // The worker already checked the 50 ms deadline, but additional
            // time may have elapsed during the async round-trip. If we're
            // still behind, discard rather than paint a stale frame.
            // (bitmap.close() releases the GPU texture handle immediately.)
            // We don't have the original timestamp here, so just paint.
            // The worker gate is the authoritative deadline check.

            canvas.width  = bitmap.width;
            canvas.height = bitmap.height;

            // GPU-composited paint — equivalent to a texture upload then blit.
            // No JPEG decoding happens here; it was done in the worker.
            ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

            // ── Release the GPU texture handle immediately ─────────────────
            // Keeping bitmaps alive is the main cause of VRAM leaks in relay mode.
            bitmap.close();
        };

        // ── Socket relay:frame handler ────────────────────────────────────────
        // This runs on the main thread but only does an ArrayBuffer.transfer() +
        // postMessage — it does NOT do any decoding, URL creation, or React setState.
        const handleRelayFrame = (arrayBuffer) => {
            const id        = ++frameIdRef.current;
            const timestamp = performance.now();

            // ── QUEUE DEPTH CHECK (pre-worker) ────────────────────────────
            // pendingFrames tracks in-flight work. If we already have 2 frames
            // decoding, this one is already stale — skip the worker entirely.
            if (pendingFrames.size >= 2) {
                return; // drop; don't even postMessage
            }

            pendingFrames.set(id, { timestamp });

            // Transfer the ArrayBuffer into the worker (zero-copy).
            // After this call, `arrayBuffer` is detached on the main thread.
            worker.postMessage({ id, buffer: arrayBuffer, timestamp }, [arrayBuffer]);
        };

        socket.on('relay:frame', handleRelayFrame);

        return () => {
            socket.off('relay:frame', handleRelayFrame);
            worker.terminate();
            workerRef.current = null;
        };
    }, [relayMode, socket]);

    // ── Mouse ─────────────────────────────────────────────────────────────────
    // Coalescing, channel choice and ordering are the InputSender's job; here we only translate coordinates.
    const handleMouseMove = useCallback((e, type) => {
        e.stopPropagation();
        if (!sendInputEvent) return;
        const pos = getPointerPosition(e);
        if (!pos) return;
        sendInputEvent({ type, x: pos.x, y: pos.y, button: e.button, buttons: e.buttons });
    }, [getPointerPosition, sendInputEvent]);

    // A button released OUTSIDE the video (drag that ended over the toolbar or off the window) never reaches the
    // video's onMouseUp: without this the host would keep the button held down.
    useEffect(() => {
        const onWindowMouseUp = (e) => {
            const target = relayMode ? canvasRef.current : videoRef.current;
            if (inputSender && target && e.target !== target && inputSender.pressedButtons.has(e.button)) {
                sendInputEvent({ type: 'mouse_up', button: e.button });
            }
        };
        window.addEventListener('mouseup', onWindowMouseUp);
        return () => window.removeEventListener('mouseup', onWindowMouseUp);
    }, [relayMode, inputSender, sendInputEvent]);

    // ── Scroll wheel ──────────────────────────────────────────────────────────
    const handleMouseWheel = useCallback((e) => {
        e.preventDefault();
        if (!sendInputEvent) return;
        // Normalise to pixels (Firefox reports lines, some devices pages) so the host sees one unit.
        const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 800 : 1;
        sendInputEvent({ type: 'mouse_wheel', deltaX: e.deltaX * unit, deltaY: e.deltaY * unit });
    }, [sendInputEvent]);

    // ── Touch → Mouse mapping ─────────────────────────────────────────────────
    const handleTouchStart = useCallback((e) => {
        e.preventDefault();
        if (!sendInputEvent) return;
        const touch = e.touches[0];
        const pos = getPointerPosition({ clientX: touch.clientX, clientY: touch.clientY, target: e.target });
        if (!pos) return;
        sendInputEvent({ type: 'mouse_move', x: pos.x, y: pos.y });
        sendInputEvent({ type: 'mouse_down', button: 0 });
    }, [getPointerPosition, sendInputEvent]);

    const handleTouchMove = useCallback((e) => {
        e.preventDefault();
        if (!sendInputEvent) return;
        const touch = e.touches[0];
        const pos = getPointerPosition({ clientX: touch.clientX, clientY: touch.clientY, target: e.target });
        if (!pos) return;
        sendInputEvent({ type: 'mouse_move', x: pos.x, y: pos.y });
    }, [getPointerPosition, sendInputEvent]);

    const handleTouchEnd = useCallback(() => {
        if (sendInputEvent) sendInputEvent({ type: 'mouse_up', button: 0 });
    }, [sendInputEvent]);

    // ── Keyboard ──────────────────────────────────────────────────────────────
    const handleKeyDown = useCallback((e) => {
        e.preventDefault();
        if (!sendInputEvent) return;
        sendInputEvent({ type: 'key_down', key: e.key, code: e.code, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey });
    }, [sendInputEvent]);

    const handleKeyUp = useCallback((e) => {
        e.preventDefault();
        if (!sendInputEvent) return;
        sendInputEvent({ type: 'key_up', key: e.key, code: e.code, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey });
    }, [sendInputEvent]);

    // ── Window Blur / Focus Loss / Hidden tab ─────────────────────────────────
    // If the user triggers an OS shortcut (Win+D, Alt+Tab) or switches tab, the browser stops delivering key_up /
    // mouse_up events. Release everything that is held so no key or button stays stuck down on the host.
    useEffect(() => {
        const releaseAll = () => { if (inputSender) inputSender.releaseAll(); };
        const onVisibility = () => { if (document.hidden) releaseAll(); };
        window.addEventListener('blur', releaseAll);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('blur', releaseAll);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [inputSender]);

    // ── Shared pointer-event props ────────────────────────────────────────────
    const pointerProps = {
        onTouchStart:  handleTouchStart,
        onTouchMove:   handleTouchMove,
        onTouchEnd:    handleTouchEnd,
        onMouseMove:   (e) => handleMouseMove(e, 'mouse_move'),
        onMouseDown:   (e) => handleMouseMove(e, 'mouse_down'),
        onMouseUp:     (e) => handleMouseMove(e, 'mouse_up'),
        onWheel:       handleMouseWheel,
        onContextMenu: (e) => e.preventDefault(),
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            className="remote-container relative w-full h-full bg-[#0b0f14] overflow-hidden flex flex-col focus:outline-none"
        >
            <TopToolbar
                peerConnection={peerConnection}
                sendInputEvent={sendInputEvent}
                onDisconnect={onDisconnect}
                isFullscreen={isFullscreen}
                toggleFullscreen={toggleFullscreen}
                perfVisible={perfVisible}
                onTogglePerf={togglePerf}
                qualityPreset={qualityPreset}
                onQualityPreset={handleQualityPreset}
            />

            <PerformanceOverlay
                visible={perfVisible}
                peerConnection={peerConnection}
                videoRef={videoRef}
                inputSender={inputSender}
                sendInputEvent={sendInputEvent}
            />

            <MobileStatsOverlay 
                peerConnection={peerConnection}
                networkQuality={networkQuality}
                batteryLevel={batteryLevel}
            />

            <MobileFAB 
                isConnected={!!socket || !!stream}
                isFullscreen={isFullscreen}
                onToggleFullscreen={toggleFullscreen}
                onDisconnect={onDisconnect}
                sendInputEvent={sendInputEvent}
                clipboardText=""
                onClipboardPush={handlePushClipboard}
                onClipboardPull={handlePullClipboard}
            />

            <MobileQuickSettings 
                isOpen={showQuickSettings}
                onClose={() => setShowQuickSettings(false)}
                onUpdateSettings={(settings) => {
                    sendInputEvent({ type: 'update_resolution', resolution: settings.quality, fps: settings.fps, bitrate: settings.bitrate });
                }}
            />

            <MobileContextMenu 
                isOpen={contextMenuState.isOpen}
                position={{ x: contextMenuState.x, y: contextMenuState.y }}
                onClose={() => setContextMenuState({ ...contextMenuState, isOpen: false })}
                onAction={(action) => {
                    if (!sendInputEvent) return;
                    
                    if (action === 'cut') {
                        sendInputEvent({ type: 'key_down', code: 'ControlLeft' });
                        sendInputEvent({ type: 'key_down', key: 'x' });
                        sendInputEvent({ type: 'key_up', key: 'x' });
                        sendInputEvent({ type: 'key_up', code: 'ControlLeft' });
                    } else if (action === 'copy') {
                        sendInputEvent({ type: 'key_down', code: 'ControlLeft' });
                        sendInputEvent({ type: 'key_down', key: 'c' });
                        sendInputEvent({ type: 'key_up', key: 'c' });
                        sendInputEvent({ type: 'key_up', code: 'ControlLeft' });
                    } else if (action === 'paste') {
                        sendInputEvent({ type: 'key_down', code: 'ControlLeft' });
                        sendInputEvent({ type: 'key_down', key: 'v' });
                        sendInputEvent({ type: 'key_up', key: 'v' });
                        sendInputEvent({ type: 'key_up', code: 'ControlLeft' });
                    } else if (action === 'rename') {
                        sendInputEvent({ type: 'key_down', key: 'F2' });
                        sendInputEvent({ type: 'key_up', key: 'F2' });
                    }
                }}
            />

            <div className={`flex-1 min-h-0 flex items-center justify-center relative overflow-hidden bg-black ${relayMode ? 'border-[4px] border-indigo-500/30' : ''}`}>

                {relayMode && (
                    <div className="absolute top-4 left-4 z-50 px-3 py-1.5 rounded-full bg-indigo-900/80 border border-indigo-400/50 text-indigo-300 text-xs font-bold uppercase tracking-widest backdrop-blur-md shadow-lg flex flex-row items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
                        CLOUD RELAY ACTIVE
                    </div>
                )}

                {/* ── RELAY MODE: GPU-composited canvas ─────────────────────────────── */}
                {relayMode ? (
                    <canvas
                        ref={canvasRef}
                        className="w-full h-full object-contain cursor-default"
                        style={{ imageRendering: 'pixelated' }}
                        {...pointerProps}
                    />
                ) : (
                    /* ── WEBRTC MODE: native video element ──────────────────────────── */
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        disablePictureInPicture
                        disableRemotePlayback
                        className="w-full h-full object-contain cursor-default pointer-events-auto"
                        {...pointerProps}
                    />
                )}

                {/* Loading overlay */}
                {((!relayMode && !stream) || (relayMode && !socket)) && (
                    <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 text-slate-500">
                        <div className="w-12 h-12 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin"></div>
                        <p>{relayMode ? 'Establishing Secure Cloud Relay...' : 'Waiting for direct STUN/TURN stream...'}</p>
                    </div>
                )}

                {/* Paused overlay */}
                {isControlPaused && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
                        <div className="bg-red-950/90 border border-red-500/50 text-red-300 px-5 py-3 rounded-2xl shadow-[0_4px_30px_rgba(239,68,68,0.3)] flex flex-row items-center gap-4 animate-in slide-in-from-bottom-8 duration-300 backdrop-blur-md">
                            <div className="w-10 h-10 rounded-full bg-red-900/50 flex items-center justify-center border border-red-500/30 shrink-0">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            </div>
                            <div className="flex flex-col text-left">
                                <h3 className="text-base font-bold text-white tracking-wide leading-tight">Control Paused by Host</h3>
                                <p className="text-xs font-medium opacity-80 mt-0.5">
                                    Remote input is temporarily blocked.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
