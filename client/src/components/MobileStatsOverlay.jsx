import React, { useState, useEffect, useRef } from 'react';
import { X, Activity, Battery, BatteryCharging, Clock, Wifi } from 'lucide-react';

export default function MobileStatsOverlay({ peerConnection, networkQuality, batteryLevel }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState({ ping: 0, fps: 0, bitrate: 0 });
  const [sessionTime, setSessionTime] = useState(0);
  const collapseTimeoutRef = useRef(null);
  
  const lastBytesRef = useRef(0);
  const lastTimeRef = useRef(Date.now());

  // Stats Polling Loop
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

  // Session Timer Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-collapse after 4 seconds of inactivity when expanded
  useEffect(() => {
    if (isExpanded) {
      resetCollapseTimeout();
    } else {
      if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
    }
    return () => {
      if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
    };
  }, [isExpanded]);

  const resetCollapseTimeout = () => {
    if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
    collapseTimeoutRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, 4000);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return h === '00' ? `${m}:${s}` : `${h}:${m}:${s}`;
  };

  const getQualityColor = () => {
    switch (networkQuality) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-yellow-500';
      case 'fair': return 'bg-orange-500';
      default: return 'bg-red-500';
    }
  };

  const getQualityText = () => {
    switch (networkQuality) {
      case 'excellent': return 'Excellent (4G/5G)';
      case 'good': return 'Good (3G/WiFi)';
      case 'fair': return 'Fair Connection';
      default: return 'Poor Connection';
    }
  };

  if (!isExpanded) {
    return (
      <div 
        className="mobile-stats-overlay md:hidden flex items-center gap-2 bg-[#0b0f14]/80 backdrop-blur-md border border-slate-700/50 rounded-full px-3 py-1.5 shadow-lg cursor-pointer"
        onClick={() => setIsExpanded(true)}
      >
        <div className={`w-2 h-2 rounded-full ${getQualityColor()} animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.3)]`}></div>
        <div className="flex items-center text-[10px] font-mono text-cyan-400 font-medium tracking-wide divide-x divide-slate-600/50">
          <span className="pr-1.5">{stats.ping}ms</span>
          <span className="px-1.5">{stats.fps}fps</span>
          <span className="pl-1.5">{stats.bitrate}Mbps</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="mobile-stats-overlay md:hidden w-56 bg-[#0b0f14]/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden"
      onClick={resetCollapseTimeout}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-white/5">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Activity size={12} className="text-cyan-400" /> Connection Stats
        </span>
        <button 
          onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
          className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10"
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-3 flex flex-col gap-2.5">
        {/* Network Quality */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <Wifi size={14} className={networkQuality === 'excellent' ? 'text-green-400' : networkQuality === 'good' ? 'text-yellow-400' : 'text-red-400'} />
          <span className="text-slate-300">{getQualityText()}</span>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="bg-white/5 rounded-lg p-2 flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Ping</span>
            <span className="text-xs font-mono text-cyan-400 font-medium">{stats.ping} ms</span>
          </div>
          <div className="bg-white/5 rounded-lg p-2 flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">FPS</span>
            <span className="text-xs font-mono text-cyan-400 font-medium">{stats.fps}</span>
          </div>
          <div className="bg-white/5 rounded-lg p-2 flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Bitrate</span>
            <span className="text-xs font-mono text-cyan-400 font-medium">{stats.bitrate} Mbps</span>
          </div>
          <div className="bg-white/5 rounded-lg p-2 flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Battery</span>
            <div className="flex items-center gap-1">
              <span className={`text-xs font-mono font-medium ${batteryLevel <= 20 ? 'text-red-400' : 'text-green-400'}`}>
                {batteryLevel}%
              </span>
            </div>
          </div>
        </div>

        {/* Uptime */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
          <Clock size={12} />
          <span className="font-mono">{formatTime(sessionTime)}</span>
        </div>
      </div>
    </div>
  );
}
