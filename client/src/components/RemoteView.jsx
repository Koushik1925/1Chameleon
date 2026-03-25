import { useEffect, useRef, useState, useCallback } from 'react';
import TopToolbar from './TopToolbar';

export default function RemoteView({ stream, peerConnection, dataChannel, onDisconnect, relayMode, relayFrame, socket, sessionId }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Throttling ref for mouse movement
    const lastMoveTimeRef = useRef(0);

    useEffect(() => {
        if (!relayMode && videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.warn("Video autoplay blocked", e));
            if (containerRef.current) containerRef.current.focus();
        }
    }, [stream, relayMode]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const getPointerPosition = (e) => {
        const target = relayMode ? e.target : videoRef.current;
        if (!target) return null;

        const rect = target.getBoundingClientRect();
        let contentWidth, contentHeight;

        if (relayMode) {
            contentWidth = target.naturalWidth || rect.width;
            contentHeight = target.naturalHeight || rect.height;
        } else {
            contentWidth = target.videoWidth;
            contentHeight = target.videoHeight;
        }

        if (!contentWidth || !contentHeight) return null;

        const contentAspectRatio = contentWidth / contentHeight;
        const rectAspectRatio = rect.width / rect.height;

        let renderedWidth = rect.width;
        let renderedHeight = rect.height;
        let offsetLeft = 0;
        let offsetTop = 0;

        if (contentAspectRatio > rectAspectRatio) {
            renderedHeight = rect.width / contentAspectRatio;
            offsetTop = (rect.height - renderedHeight) / 2;
        } else {
            renderedWidth = rect.height * contentAspectRatio;
            offsetLeft = (rect.width - renderedWidth) / 2;
        }

        let x = (e.clientX - rect.left - offsetLeft) / renderedWidth;
        let y = (e.clientY - rect.top - offsetTop) / renderedHeight;

        x = Math.max(0, Math.min(1, x));
        y = Math.max(0, Math.min(1, y));

        return { x, y };
    };

    const sendInput = useCallback((input) => {
        if (relayMode && socket) {
            socket.emit('relay:input', { sessionId, input });
        } else if (dataChannel?.readyState === 'open') {
            dataChannel.send(JSON.stringify(input));
        }
    }, [relayMode, socket, sessionId, dataChannel]);

    const handleMouseMove = useCallback((e, type) => {
        e.stopPropagation();

        const now = Date.now();
        if (type === 'mouse_move' && now - lastMoveTimeRef.current < 16) return;
        lastMoveTimeRef.current = now;

        const pos = getPointerPosition(e);
        if (!pos) return;

        sendInput({ type, x: pos.x, y: pos.y, button: e.button, buttons: e.buttons });
    }, [getPointerPosition, sendInput]);

    const handleMouseWheel = useCallback((e) => {
        e.preventDefault();
        sendInput({
            type: 'mouse_wheel',
            deltaX: e.deltaX,
            deltaY: e.deltaY
        });
    }, [sendInput]);

    // Basic touch to mouse mapping for MVP
    const handleTouchStart = useCallback((e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const pos = getPointerPosition({ clientX: touch.clientX, clientY: touch.clientY, target: e.target });
        if (!pos) return;

        sendInput({ type: 'mouse_move', x: pos.x, y: pos.y, isDown: true });
        // Emulate left click down on touch start
        sendInput({ type: 'mouse_down', button: 0 });
    }, [getPointerPosition, sendInput]);

    const handleTouchMove = useCallback((e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const pos = getPointerPosition({ clientX: touch.clientX, clientY: touch.clientY, target: e.target });
        if (!pos) return;

        sendInput({
            type: 'mouse_move',
            x: pos.x, y: pos.y,
            isDown: true
        });
    }, [getPointerPosition, sendInput]);

    const handleTouchEnd = useCallback(() => {
        // Release left click on touch end
        sendInput({ type: 'mouse_up', button: 0 });
    }, [sendInput]);

    const handleKeyDown = useCallback((e) => {
        e.preventDefault();
        sendInput({
            type: 'key_down',
            key: e.key,
            code: e.code,
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            metaKey: e.metaKey
        });
    }, [sendInput]);

    const handleKeyUp = useCallback((e) => {
        e.preventDefault();
        sendInput({
            type: 'key_up',
            key: e.key,
            code: e.code,
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            metaKey: e.metaKey
        });
    }, [sendInput]);

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
                sendInputEvent={sendInput} 
                onDisconnect={onDisconnect}
                isFullscreen={isFullscreen}
                toggleFullscreen={toggleFullscreen}
            />

            <div className={`flex-1 min-h-0 flex items-center justify-center relative touch-none overflow-hidden bg-black ${relayMode ? 'border-[4px] border-indigo-500/30' : ''}`}>
                
                {relayMode && (
                    <div className="absolute top-4 left-4 z-50 px-3 py-1.5 rounded-full bg-indigo-900/80 border border-indigo-400/50 text-indigo-300 text-xs font-bold uppercase tracking-widest backdrop-blur-md shadow-lg flex flex-row items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
                        CLOUD RELAY ACTIVE
                    </div>
                )}
                
                {relayMode ? (
                    <img
                        src={relayFrame || ''}
                        alt="Remote Feed"
                        className="w-full h-full object-contain cursor-crosshair"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onMouseMove={(e) => handleMouseMove(e, 'mouse_move')}
                        onMouseDown={(e) => handleMouseMove(e, 'mouse_down')}
                        onMouseUp={(e) => handleMouseMove(e, 'mouse_up')}
                        onWheel={handleMouseWheel}
                        onContextMenu={(e) => e.preventDefault()}
                    />
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain cursor-crosshair pointer-events-auto"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onMouseMove={(e) => handleMouseMove(e, 'mouse_move')}
                        onMouseDown={(e) => handleMouseMove(e, 'mouse_down')}
                        onMouseUp={(e) => handleMouseMove(e, 'mouse_up')}
                        onWheel={handleMouseWheel}
                        onContextMenu={(e) => e.preventDefault()}
                    />
                )}

                {(!relayMode && !stream) || (relayMode && !relayFrame) ? (
                    <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 text-slate-500">
                        <div className="w-12 h-12 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin"></div>
                        <p>{relayMode ? 'Establishing Secure Cloud Relay...' : 'Waiting for direct STUN/TURN stream...'}</p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
