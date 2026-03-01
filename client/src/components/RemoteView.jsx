import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Power, MousePointer2 } from 'lucide-react';

export default function RemoteView({ stream, onDisconnect, sendInputEvent }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

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

    // Basic touch to mouse mapping for MVP
    const handleTouchStart = (e) => {
        if (!sendInputEvent) return;
        const touch = e.touches[0];
        const rect = videoRef.current.getBoundingClientRect();
        const x = (touch.clientX - rect.left) / rect.width;
        const y = (touch.clientY - rect.top) / rect.height;

        sendInputEvent({ type: 'mouse_move', x, y, isDown: true });
        // Emulate left click down on touch start
        sendInputEvent({ type: 'mouse_down', button: 0 });
    };

    const handleTouchMove = (e) => {
        if (!sendInputEvent) return;
        const touch = e.touches[0];
        const rect = videoRef.current.getBoundingClientRect();
        const x = (touch.clientX - rect.left) / rect.width;
        const y = (touch.clientY - rect.top) / rect.height;

        sendInputEvent({
            type: 'mouse_move',
            x, y,
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
                // Prevent browser shortcuts like F5 or spacebar scrolling while controlling the remote PC
                e.preventDefault();
                if (sendInputEvent) sendInputEvent({ type: 'key_down', code: e.code, key: e.key });
            }}
            onKeyUp={(e) => {
                e.preventDefault();
                if (sendInputEvent) sendInputEvent({ type: 'key_up', code: e.code, key: e.key });
            }}
            className="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col focus:outline-none"
        >
            <div className="flex-none flex justify-between items-center p-3 bg-slate-900 border-b border-slate-800 z-10 shadow-md">
                <div className="flex items-center gap-2 text-green-400">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm font-medium">Connected to Host</span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white backdrop-blur transition-all"
                        title="Toggle Fullscreen"
                    >
                        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>

                    <button
                        onClick={onDisconnect}
                        className="p-2 rounded-lg bg-red-500/80 hover:bg-red-600 text-white backdrop-blur transition-all flex items-center gap-2 px-4"
                    >
                        <Power size={20} />
                        <span className="font-medium">Disconnect</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex items-center justify-center relative touch-none overflow-hidden bg-black">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="max-w-full max-h-full object-contain pointer-events-auto"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    // MVP mouse support for testing on laptop
                    onMouseMove={(e) => {
                        if (!sendInputEvent) return;
                        const rect = videoRef.current.getBoundingClientRect();
                        const x = (e.clientX - rect.left) / rect.width;
                        const y = (e.clientY - rect.top) / rect.height;
                        sendInputEvent({ type: 'mouse_move', x, y, isDown: e.buttons > 0 });
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
