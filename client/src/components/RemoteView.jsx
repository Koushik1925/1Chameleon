import { useEffect, useRef, useState, useCallback } from 'react';
import TopToolbar from './TopToolbar';

export default function RemoteView({ stream, peerConnection, onDisconnect, sendInputEvent }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Throttling ref for mouse movement
    const lastMoveTimeRef = useRef(0);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            if (containerRef.current) containerRef.current.focus();
        }
    }, [stream]);

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

    const getPointerPosition = (clientX, clientY) => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return null;

        const rect = video.getBoundingClientRect();
        const videoAspectRatio = video.videoWidth / video.videoHeight;
        const rectAspectRatio = rect.width / rect.height;

        let renderedWidth = rect.width;
        let renderedHeight = rect.height;
        let offsetLeft = 0;
        let offsetTop = 0;

        if (videoAspectRatio > rectAspectRatio) {
            renderedHeight = rect.width / videoAspectRatio;
            offsetTop = (rect.height - renderedHeight) / 2;
        } else {
            renderedWidth = rect.height * videoAspectRatio;
            offsetLeft = (rect.width - renderedWidth) / 2;
        }

        let x = (clientX - rect.left - offsetLeft) / renderedWidth;
        let y = (clientY - rect.top - offsetTop) / renderedHeight;

        x = Math.max(0, Math.min(1, x));
        y = Math.max(0, Math.min(1, y));

        return { x, y };
    };

    // Basic touch to mouse mapping for MVP
    const handleTouchStart = (e) => {
        if (!sendInputEvent) return;
        const touch = e.touches[0];
        const pos = getPointerPosition(touch.clientX, touch.clientY);
        if (!pos) return;

        sendInputEvent({ type: 'mouse_move', x: pos.x, y: pos.y, isDown: true });
        // Emulate left click down on touch start
        sendInputEvent({ type: 'mouse_down', button: 0 });
    };

    const handleTouchMove = (e) => {
        if (!sendInputEvent) return;
        const touch = e.touches[0];
        const pos = getPointerPosition(touch.clientX, touch.clientY);
        if (!pos) return;

        sendInputEvent({
            type: 'mouse_move',
            x: pos.x, y: pos.y,
            isDown: true
        });
    };

    const handleTouchEnd = () => {
        if (!sendInputEvent) return;
        // Release left click on touch end
        sendInputEvent({ type: 'mouse_up', button: 0 });
    };

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            onKeyDown={(e) => {
                e.preventDefault();
                if (sendInputEvent) sendInputEvent({ type: 'key_down', code: e.code, key: e.key });
            }}
            onKeyUp={(e) => {
                e.preventDefault();
                if (sendInputEvent) sendInputEvent({ type: 'key_up', code: e.code, key: e.key });
            }}
            className="relative w-full h-full bg-[#0b0f14] overflow-hidden flex flex-col focus:outline-none"
        >
            <TopToolbar
                peerConnection={peerConnection}
                sendInputEvent={sendInputEvent}
                onDisconnect={onDisconnect}
                isFullscreen={isFullscreen}
                toggleFullscreen={toggleFullscreen}
            />

            <div className="flex-1 min-h-0 flex items-center justify-center relative touch-none overflow-hidden bg-black">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain pointer-events-auto"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    // MVP mouse support for testing on laptop
                    onMouseMove={(e) => {
                        e.stopPropagation(); // don't trigger the container's mouse move

                        if (!sendInputEvent) return;

                        // Strict 16ms mathematical throttle (approx 60hz) to avoid lag spikes
                        const now = Date.now();
                        if (now - lastMoveTimeRef.current < 16) return;
                        lastMoveTimeRef.current = now;

                        const pos = getPointerPosition(e.clientX, e.clientY);
                        if (!pos) return;
                        sendInputEvent({ type: 'mouse_move', x: pos.x, y: pos.y, isDown: e.buttons > 0 });
                    }}
                    onMouseDown={(e) => sendInputEvent && sendInputEvent({ type: 'mouse_down', button: e.button })}
                    onMouseUp={(e) => sendInputEvent && sendInputEvent({ type: 'mouse_up', button: e.button })}
                />

                {!stream && (
                    <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 text-slate-500">
                        <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
                        <p>Waiting for video stream...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
