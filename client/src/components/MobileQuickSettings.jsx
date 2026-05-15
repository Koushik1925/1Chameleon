import React, { useState, useEffect } from 'react';
import { Settings, X, Monitor, Zap, EyeOff } from 'lucide-react';

export default function MobileQuickSettings({ 
  isOpen, 
  onClose, 
  onUpdateSettings 
}) {
  const [quality, setQuality] = useState('720p');
  const [fps, setFps] = useState(30);
  const [bitrate, setBitrate] = useState(3.0);
  
  const [keepScreenOn, setKeepScreenOn] = useState(true);
  const [powerSaving, setPowerSaving] = useState(false);
  const [hideStats, setHideStats] = useState(false);

  // Wake lock ref
  const wakeLockRef = React.useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([20]);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    // Basic power saving effect: limit FPS and bitrate locally if enabled
    if (powerSaving) {
      setQuality('480p');
      setFps(15);
      setBitrate(1.0);
      applySettings('480p', 15, 1.0);
    }
  }, [powerSaving]);

  useEffect(() => {
    // Screen Wake Lock API
    const requestWakeLock = async () => {
      if (keepScreenOn && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch (err) {
          // ignore
        }
      } else if (!keepScreenOn && wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
    requestWakeLock();
    
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, [keepScreenOn]);

  const applySettings = (q = quality, f = fps, b = bitrate) => {
    onUpdateSettings({ quality: q, fps: f, bitrate: b });
  };

  const handleQualityChange = (newQ) => {
    setQuality(newQ);
    applySettings(newQ, fps, bitrate);
  };

  // Debounced slider changes
  const handleFpsChange = (e) => {
    const val = parseInt(e.target.value);
    setFps(val);
  };
  
  const handleFpsCommit = () => {
    applySettings(quality, fps, bitrate);
  };

  const handleBitrateChange = (e) => {
    const val = parseFloat(e.target.value);
    setBitrate(val);
  };

  const handleBitrateCommit = () => {
    applySettings(quality, fps, bitrate);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-start justify-center touch-none">
      {/* Dark overlay */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Slide-down Panel */}
      <div 
        className="mobile-quick-settings relative w-full max-w-sm mt-[env(safe-area-inset-top)] mx-2 bg-[#111827] rounded-3xl border border-slate-700 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/5">
          <span className="text-sm font-bold text-white flex items-center gap-2">
            <Settings size={16} className="text-cyan-400" /> QUICK SETTINGS
          </span>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-6 max-h-[70vh] overflow-y-auto overscroll-contain">
          
          {/* Quality Presets */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Resolution Quality</span>
            <div className="flex bg-[#0b0f14] rounded-xl p-1 border border-slate-700/50">
              {['480p', '720p', '1080p'].map(q => (
                <button
                  key={q}
                  onClick={() => handleQualityChange(q)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    quality === q 
                      ? 'bg-cyan-500 text-black shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {q === '480p' ? 'Low' : q === '720p' ? 'Balanced' : 'High'}
                </button>
              ))}
            </div>
          </div>

          {/* FPS Slider */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Target FPS</span>
              <span className="text-xs font-mono font-bold text-cyan-400">{fps}</span>
            </div>
            <input 
              type="range" 
              min="15" 
              max="60" 
              step="5" 
              value={fps} 
              onChange={handleFpsChange}
              onMouseUp={handleFpsCommit}
              onTouchEnd={handleFpsCommit}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-600 font-mono">
              <span>15</span>
              <span>60</span>
            </div>
          </div>

          {/* Bitrate Slider */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Max Bitrate</span>
              <span className="text-xs font-mono font-bold text-cyan-400">{bitrate.toFixed(1)} Mbps</span>
            </div>
            <input 
              type="range" 
              min="1.0" 
              max="20.0" 
              step="0.5" 
              value={bitrate} 
              onChange={handleBitrateChange}
              onMouseUp={handleBitrateCommit}
              onTouchEnd={handleBitrateCommit}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-600 font-mono">
              <span>1.0</span>
              <span>20.0</span>
            </div>
          </div>

          <div className="h-px bg-slate-700/50 w-full my-1"></div>

          {/* Toggles */}
          <div className="flex flex-col gap-1">
            <label className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Monitor size={16} className={keepScreenOn ? 'text-cyan-400' : 'text-slate-500'} />
                <span className="text-sm font-medium text-slate-300">Keep Screen On</span>
              </div>
              <input 
                type="checkbox" 
                checked={keepScreenOn} 
                onChange={(e) => setKeepScreenOn(e.target.checked)}
                className="w-10 h-5 bg-slate-700 rounded-full appearance-none relative checked:bg-cyan-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:w-4 after:h-4 after:rounded-full after:transition-transform checked:after:translate-x-5 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Zap size={16} className={powerSaving ? 'text-yellow-400' : 'text-slate-500'} />
                <span className="text-sm font-medium text-slate-300">Power Saving Mode</span>
              </div>
              <input 
                type="checkbox" 
                checked={powerSaving} 
                onChange={(e) => setPowerSaving(e.target.checked)}
                className="w-10 h-5 bg-slate-700 rounded-full appearance-none relative checked:bg-yellow-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:w-4 after:h-4 after:rounded-full after:transition-transform checked:after:translate-x-5 cursor-pointer"
              />
            </label>

            {/* Note: hideStats functionality would need to be wired back to App state, omitting actual logic for now */}
            <label className="flex items-center justify-between py-3 opacity-50">
              <div className="flex items-center gap-3">
                <EyeOff size={16} className={hideStats ? 'text-cyan-400' : 'text-slate-500'} />
                <span className="text-sm font-medium text-slate-300">Hide Stats Overlay</span>
              </div>
              <input 
                type="checkbox" 
                checked={hideStats} 
                onChange={(e) => setHideStats(e.target.checked)}
                disabled
                className="w-10 h-5 bg-slate-700 rounded-full appearance-none relative checked:bg-cyan-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:w-4 after:h-4 after:rounded-full after:transition-transform checked:after:translate-x-5 cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
