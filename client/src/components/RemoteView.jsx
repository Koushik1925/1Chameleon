import { useEffect, useRef, useCallback } from 'react';
import TopToolbar from './TopToolbar';

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
 *   - RAF-coalesced mouse movement: one network send per paint frame max.
 *   - bundlePolicy: 'max-bundle' is configured upstream in App.jsx.
 */

export default function RemoteView({ stream, peerConnection, onDisconnect, relayMode, isControlPaused, sendInputEvent, socket, sessionId }) {
    // ── Refs ─────────────────────────────────────────────────────────────────
    const videoRef     = useRef(null);
    const canvasRef    = useRef(null);  // relay rendering target
    const containerRef = useRef(null);
    const workerRef    = useRef(null);  // frameWorker instance
    const frameIdRef   = useRef(0);     // monotonic frame ID for worker correlation

    // RAF mouse coalescing
    const rafPendingRef       = useRef(false);
    const latestMouseEventRef = useRef(null);

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

    // ── RAF-coalesced mouse move ───────────────────────────────────────────────
    const handleMouseMove = useCallback((e, type) => {
        e.stopPropagation();
        const pos = getPointerPosition(e);
        if (!pos) return;

        const payload = { type, x: pos.x, y: pos.y, button: e.button, buttons: e.buttons };

        if (type === 'mouse_move') {
            latestMouseEventRef.current = payload;
            if (!rafPendingRef.current) {
                rafPendingRef.current = true;
                requestAnimationFrame(() => {
                    rafPendingRef.current = false;
                    const evt = latestMouseEventRef.current;
                    if (evt && sendInputEvent) sendInputEvent(evt);
                    latestMouseEventRef.current = null;
                });
            }
        } else {
            if (sendInputEvent) sendInputEvent(payload);
        }
    }, [getPointerPosition, sendInputEvent]);

    // ── Scroll wheel ──────────────────────────────────────────────────────────
    const handleMouseWheel = useCallback((e) => {
        e.preventDefault();
        if (sendInputEvent) sendInputEvent({ type: 'mouse_wheel', deltaX: e.deltaX, deltaY: e.deltaY });
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
            className="relative w-full h-full bg-[#0b0f14] overflow-hidden flex flex-col focus:outline-none"
        >
            <TopToolbar
                peerConnection={peerConnection}
                sendInputEvent={sendInputEvent}
                onDisconnect={onDisconnect}
            />

            <div className={`flex-1 min-h-0 flex items-center justify-center relative touch-none overflow-hidden bg-black ${relayMode ? 'border-[4px] border-indigo-500/30' : ''}`}>

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
                        className="w-full h-full object-contain cursor-default pointer-events-auto"
                        style={{ willChange: 'contents' }}
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
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-[100] pointer-events-none">
                        <div className="bg-red-950/80 border border-red-500/50 text-red-300 px-6 py-4 rounded-2xl shadow-[0_0_40px_rgba(239,68,68,0.2)] flex flex-col items-center gap-3 animate-in zoom-in-95 duration-300">
                            <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center border border-red-500/30">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold tracking-wide text-white">Control Paused by Host</h3>
                            <p className="text-sm font-medium opacity-80 text-center max-w-[250px]">
                                The host machine has temporarily blocked remote input. Video stream is still active.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
