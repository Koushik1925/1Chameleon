import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Keyboard,
    Command,
    ClipboardType,
    Settings,
    Maximize2,
    Minimize2,
    Power,
    GripHorizontal,
    ChevronRight,
    ChevronLeft
} from 'lucide-react';

export default function TopToolbar({
    peerConnection,
    sendInputEvent,
    onDisconnect,
    isFullscreen,
    toggleFullscreen
}) {
    // --- Draggable & Compact State ---
    const MathMin = Math.min;
    const MathMax = Math.max;

    // Default position at top center
    const [position, setPosition] = useState({
        x: typeof window !== 'undefined' ? window.innerWidth / 2 - 300 : 100,
        y: 20
    });
    const [isDragging, setIsDragging] = useState(false);
    const [isCompact, setIsCompact] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        // Prevent dragging if interacting with a button or dropdown
        if (e.target.closest('button') || e.target.closest('.no-drag')) return;
        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    const handleMouseMove = useCallback((e) => {
        if (isDragging) {
            let newX = e.clientX - dragOffset.current.x;
            let newY = e.clientY - dragOffset.current.y;

            // Keep within window bounds
            newX = MathMax(10, MathMin(newX, window.innerWidth - 100));
            newY = MathMax(10, MathMin(newY, window.innerHeight - 50));

            setPosition({ x: newX, y: newY });
        }
    }, [isDragging]);

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove]);
    const [stats, setStats] = useState({ ping: 0, fps: 0, bitrate: 0 });
    const [sessionTime, setSessionTime] = useState(0);
    const [showModifiers, setShowModifiers] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showClipboard, setShowClipboard] = useState(false);
    const [activeModifiers, setActiveModifiers] = useState({
        ControlLeft: false,
        AltLeft: false,
        ShiftLeft: false,
        MetaLeft: false
    });

    const lastBytesRef = useRef(0);
    const lastTimeRef = useRef(Date.now());

    // --- Stats Polling Loop (Isolated to this component to prevent video re-renders) ---
    useEffect(() => {
        if (!peerConnection) return;

        const interval = setInterval(async () => {
            try {
                const statsArray = await peerConnection.getStats();
                let ping = 0;
                let fps = 0;
                let currentBytes = 0;

                statsArray.forEach(report => {
                    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                        ping = Math.round(report.currentRoundTripTime * 1000) || 0;
                    }
                    if (report.type === 'inbound-rtp' && report.kind === 'video') {
                        fps = report.framesPerSecond || 0;
                        currentBytes = report.bytesReceived || 0;
                    }
                });

                const now = Date.now();
                const timeDiff = (now - lastTimeRef.current) / 1000;
                const bytesDiff = currentBytes - lastBytesRef.current;

                let mbps = 0;
                if (bytesDiff > 0 && timeDiff > 0) {
                    const bitsPerSec = (bytesDiff * 8) / timeDiff;
                    mbps = (bitsPerSec / 1000000).toFixed(1);
                }

                lastBytesRef.current = currentBytes;
                lastTimeRef.current = now;

                setStats({ ping, fps: Math.round(fps), bitrate: mbps });
            } catch (err) {
                // Ignore silent stats drops
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [peerConnection]);

    // --- Session Timer Loop ---
    useEffect(() => {
        const interval = setInterval(() => {
            setSessionTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // --- Modifiers Logic ---
    const toggleModifier = (code) => {
        setActiveModifiers(prev => {
            const isNowActive = !prev[code];
            const newState = { ...prev, [code]: isNowActive };

            // Send the network event
            sendInputEvent({
                type: isNowActive ? 'key_down' : 'key_up',
                code: code
            });
            return newState;
        });
    };

    // --- Clipboard Logic ---
    const handlePushClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            sendInputEvent({ type: 'clipboard_push', text });
            setShowClipboard(false);
        } catch (err) {
            console.error("Failed to read clipboard:", err);
        }
    };

    const handlePullClipboard = () => {
        sendInputEvent({ type: 'clipboard_pull_request' });
        // The desktop agent will send a 'clipboard_pull_response' back over datachannel
        // which RemoteView or App will catch and write to local navigator.clipboard
        setShowClipboard(false);
    };

    // --- Resolution Control ---
    const changeResolution = (res) => {
        sendInputEvent({ type: 'update_resolution', resolution: res });
        setShowSettings(false);
    };

    return (
        <div
            className={`hidden md:flex absolute z-50 items-center transition-transform ${isDragging ? 'duration-0 opacity-90' : 'duration-300 ease-in-out'}`}
            style={{ left: position.x, top: position.y }}
            onMouseDown={handleMouseDown}
        >
            {/* Toolbar Container */}
            <div className={`flex items-center pointer-events-auto bg-[#0b0f14]/90 backdrop-blur-lg border border-slate-700/80 rounded-full p-2 gap-2 shadow-2xl shadow-black/80 transition-all duration-300 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} !select-none`}>

                {/* Drag Handle & Collapse Toggle */}
                <div className="flex items-center gap-1 pl-2 text-slate-500 hover:text-slate-300 transition-colors">
                    <GripHorizontal size={18} />
                    <button
                        onClick={() => setIsCompact(!isCompact)}
                        className="hover:bg-white/10 p-1 rounded-full transition-colors"
                        title={isCompact ? "Expand Toolbar" : "Collapse Toolbar"}
                    >
                        {isCompact ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>

                {!isCompact && (
                    <div className="flex items-center gap-3 pr-2 overflow-hidden transition-all duration-300">
                        <div className="w-[1px] h-6 bg-slate-700 mx-1"></div>

                        {/* Status & Timer */}
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse box-shadow-cyan"></div>
                            <span className="text-sm font-mono text-cyan-400 font-medium tracking-wider">
                                {formatTime(sessionTime)}
                            </span>
                        </div>

                        {/* Live Stats */}
                        <div className="flex items-center gap-4 px-2 shrink-0">
                            <div className="flex items-center gap-1.5 text-xs font-mono">
                                <span className="text-slate-500 uppercase tracking-widest text-[10px]">Ping</span>
                                <span className="text-white font-medium">{stats.ping}ms</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-mono">
                                <span className="text-slate-500 uppercase tracking-widest text-[10px]">FPS</span>
                                <span className="text-white font-medium">{stats.fps}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-mono">
                                <span className="text-slate-500 uppercase tracking-widest text-[10px]">Bitrate</span>
                                <span className="text-white font-medium">{stats.bitrate} Mbps</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="w-[1px] h-6 bg-slate-700 mx-1"></div>

                {/* Right: Controls */}
                <div className="flex items-center gap-1 pr-1 shrink-0 no-drag">

                    {/* Modifiers Toggle Panel */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowModifiers(!showModifiers); setShowSettings(false); setShowClipboard(false); }}
                            className={`p-2 rounded-lg transition-colors border ${Object.values(activeModifiers).some(v => v) || showModifiers ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-transparent text-slate-400 border-transparent hover:text-white hover:bg-white/5 whitespace-nowrap'}`}
                            title="Modifier Keys"
                        >
                            <Command size={18} />
                        </button>

                        {showModifiers && (
                            <div className="absolute top-full right-0 mt-2 bg-[#0b0f14] border border-slate-700 rounded-xl p-2 flex gap-1 shadow-xl">
                                {[
                                    { label: 'Ctrl', code: 'ControlLeft' },
                                    { label: 'Alt', code: 'AltLeft' },
                                    { label: 'Shift', code: 'ShiftLeft' },
                                    { label: 'Win', code: 'MetaLeft' }
                                ].map(mod => (
                                    <button
                                        key={mod.code}
                                        onClick={() => toggleModifier(mod.code)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${activeModifiers[mod.code] ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
                                    >
                                        {mod.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Clipboard Panel */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowClipboard(!showClipboard); setShowSettings(false); setShowModifiers(false); }}
                            className={`p-2 rounded-lg transition-colors border ${showClipboard ? 'bg-white/10 text-white border-white/20' : 'bg-transparent text-slate-400 border-transparent hover:text-white hover:bg-white/5'}`}
                            title="Clipboard Sync"
                        >
                            <ClipboardType size={18} />
                        </button>

                        {showClipboard && (
                            <div className="absolute top-full right-0 mt-2 bg-[#0b0f14] border border-slate-700 rounded-xl p-2 flex flex-col gap-1 shadow-xl min-w-[140px]">
                                <button onClick={handlePushClipboard} className="text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-md transition-colors">
                                    Push Local (PC → Host)
                                </button>
                                <button onClick={handlePullClipboard} className="text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-md transition-colors">
                                    Pull Remote (Host → PC)
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Settings Panel */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowSettings(!showSettings); setShowModifiers(false); setShowClipboard(false); }}
                            className={`p-2 rounded-lg transition-colors border ${showSettings ? 'bg-white/10 text-white border-white/20' : 'bg-transparent text-slate-400 border-transparent hover:text-white hover:bg-white/5'}`}
                            title="Stream Settings"
                        >
                            <Settings size={18} />
                        </button>

                        {showSettings && (
                            <div className="absolute top-full right-0 mt-2 bg-[#0b0f14] border border-slate-700 rounded-xl p-3 shadow-xl w-48 z-50">
                                <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-2 block">Resolution</span>
                                <div className="flex flex-col gap-1">
                                    <button onClick={() => changeResolution('1080p')} className="text-left px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-md">1080p (High)</button>
                                    <button onClick={() => changeResolution('720p')} className="text-left px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-md">720p (Balanced)</button>
                                    <button onClick={() => changeResolution('480p')} className="text-left px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-md">480p (Low Latency)</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-[1px] h-6 bg-slate-700 mx-1"></div>

                    <button
                        onClick={toggleFullscreen}
                        className="p-2 rounded-lg bg-transparent hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                        title="Toggle Fullscreen"
                    >
                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>

                    <button
                        onClick={onDisconnect}
                        className="p-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 transition-colors flex items-center gap-2 border border-red-500/20"
                        title="Disconnect"
                    >
                        <Power size={18} />
                    </button>

                </div>
            </div>

            {/* Soft Cyan Shadow Class in index.css needed for the dot */}
        </div>
    );
}
