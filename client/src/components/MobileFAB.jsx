import React, { useState, useEffect, useRef } from 'react';
import {
  MoreVertical,
  ClipboardType,
  Command,
  Settings,
  Maximize2,
  Minimize2,
  Power,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

export default function MobileFAB({
  isConnected,
  isFullscreen,
  onToggleFullscreen,
  onDisconnect,
  sendInputEvent,
  clipboardText,
  onClipboardPush,
  onClipboardPull
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null); // 'clipboard', 'modifiers', 'settings', 'disconnect'
  const menuRef = useRef(null);
  
  const [activeModifiers, setActiveModifiers] = useState({
    ControlLeft: false,
    AltLeft: false,
    ShiftLeft: false,
    MetaLeft: false
  });

  const vibrate = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30]);
    }
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveSheet(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const toggleMenu = () => {
    vibrate();
    if (isOpen) {
      setIsOpen(false);
      setActiveSheet(null);
    } else {
      setIsOpen(true);
    }
  };

  const handleActionClick = (action) => {
    vibrate();
    setActiveSheet(action);
  };

  const toggleModifier = (code) => {
    vibrate();
    setActiveModifiers(prev => {
      const isNowActive = !prev[code];
      const newState = { ...prev, [code]: isNowActive };
      sendInputEvent({
        type: isNowActive ? 'key_down' : 'key_up',
        code: code
      });
      return newState;
    });
  };

  const changeResolution = (res) => {
    vibrate();
    sendInputEvent({ type: 'update_resolution', resolution: res });
    setIsOpen(false);
    setActiveSheet(null);
  };

  // ── Render Sub-Sheets ──────────────────────────────────────────

  const renderClipboardSheet = () => (
    <div className="flex flex-col gap-2 p-2 w-48">
      <div className="flex items-center gap-2 mb-2 text-cyan-400 font-bold border-b border-white/10 pb-2">
        <button onClick={() => setActiveSheet(null)} className="p-1 hover:bg-white/10 rounded-full">
          <ArrowLeft size={16} />
        </button>
        <span className="text-sm">Clipboard</span>
      </div>
      <button 
        onClick={() => { vibrate(); onClipboardPush(); setIsOpen(false); setActiveSheet(null); }}
        className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors"
      >
        Push (Phone → PC)
      </button>
      <button 
        onClick={() => { vibrate(); onClipboardPull(); setIsOpen(false); setActiveSheet(null); }}
        className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors"
      >
        Pull (PC → Phone)
      </button>
    </div>
  );

  const renderModifiersSheet = () => (
    <div className="flex flex-col gap-2 p-2 w-48">
      <div className="flex items-center gap-2 mb-2 text-cyan-400 font-bold border-b border-white/10 pb-2">
        <button onClick={() => setActiveSheet(null)} className="p-1 hover:bg-white/10 rounded-full">
          <ArrowLeft size={16} />
        </button>
        <span className="text-sm">Modifiers</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Ctrl', code: 'ControlLeft' },
          { label: 'Alt', code: 'AltLeft' },
          { label: 'Shift', code: 'ShiftLeft' },
          { label: 'Win', code: 'MetaLeft' }
        ].map(mod => (
          <button
            key={mod.code}
            onClick={() => toggleModifier(mod.code)}
            className={`px-3 py-3 text-sm font-semibold rounded-xl border transition-all ${
              activeModifiers[mod.code] 
                ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {mod.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderSettingsSheet = () => (
    <div className="flex flex-col gap-2 p-2 w-48">
      <div className="flex items-center gap-2 mb-2 text-cyan-400 font-bold border-b border-white/10 pb-2">
        <button onClick={() => setActiveSheet(null)} className="p-1 hover:bg-white/10 rounded-full">
          <ArrowLeft size={16} />
        </button>
        <span className="text-sm">Resolution</span>
      </div>
      <button onClick={() => changeResolution('1080p')} className="text-left px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/10 rounded-xl">1080p (High)</button>
      <button onClick={() => changeResolution('720p')} className="text-left px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/10 rounded-xl">720p (Balanced)</button>
      <button onClick={() => changeResolution('480p')} className="text-left px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/10 rounded-xl">480p (Fast)</button>
    </div>
  );

  const renderDisconnectSheet = () => (
    <div className="flex flex-col gap-2 p-2 w-48">
      <div className="flex items-center gap-2 mb-2 text-red-400 font-bold border-b border-red-500/20 pb-2">
        <button onClick={() => setActiveSheet(null)} className="p-1 hover:bg-white/10 rounded-full">
          <ArrowLeft size={16} />
        </button>
        <span className="text-sm">Disconnect?</span>
      </div>
      <button 
        onClick={() => { vibrate(); onDisconnect(); }}
        className="w-full text-center px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(239,68,68,0.4)] mt-2"
      >
        Confirm Disconnect
      </button>
      <button 
        onClick={() => { vibrate(); setActiveSheet(null); setIsOpen(false); }}
        className="w-full text-center px-4 py-3 bg-slate-800 text-white rounded-xl font-medium mt-1"
      >
        Cancel
      </button>
    </div>
  );

  // ── Render Main Menu ───────────────────────────────────────────

  const renderMainMenu = () => {
    const items = [
      { icon: ClipboardType, label: 'Clipboard', action: 'clipboard', color: 'text-slate-200' },
      { icon: Command, label: 'Modifiers', action: 'modifiers', color: Object.values(activeModifiers).some(v=>v) ? 'text-cyan-400' : 'text-slate-200' },
      { icon: Settings, label: 'Settings', action: 'settings', color: 'text-slate-200' },
      { icon: isFullscreen ? Minimize2 : Maximize2, label: 'Fullscreen', isAction: true, onClick: () => { vibrate(); onToggleFullscreen(); setIsOpen(false); }, color: 'text-slate-200' },
      { icon: Power, label: 'Disconnect', action: 'disconnect', color: 'text-red-400', bgHover: 'hover:bg-red-500/20' },
    ];

    return (
      <div className="flex flex-col gap-3 p-1 items-end">
        {items.map((item, index) => (
          <div 
            key={item.label}
            className="flex items-center gap-3 mobile-fab-menu-item"
            style={{ animationDelay: `${(items.length - 1 - index) * 50}ms` }}
          >
            <span className="text-xs font-bold tracking-wide bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg text-white">
              {item.label}
            </span>
            <button
              onClick={() => item.isAction ? item.onClick() : handleActionClick(item.action)}
              className={`w-12 h-12 rounded-full flex items-center justify-center bg-slate-800/90 border border-slate-600 backdrop-blur-xl shadow-lg ${item.bgHover || 'hover:bg-slate-700'} transition-colors touch-manipulation`}
            >
              <item.icon size={20} className={item.color} />
            </button>
          </div>
        ))}
      </div>
    );
  };

  if (!isConnected) return null;

  return (
    <div ref={menuRef} className="mobile-fab md:hidden flex flex-col items-end gap-3 z-[1000] touch-none">
      
      {/* Menu Area */}
      {isOpen && (
        <div className="bg-[#0b0f14]/95 border border-slate-700/80 rounded-3xl shadow-2xl backdrop-blur-xl mb-2 origin-bottom-right transition-all">
          {activeSheet === 'clipboard' && renderClipboardSheet()}
          {activeSheet === 'modifiers' && renderModifiersSheet()}
          {activeSheet === 'settings' && renderSettingsSheet()}
          {activeSheet === 'disconnect' && renderDisconnectSheet()}
          {!activeSheet && renderMainMenu()}
        </div>
      )}

      {/* Primary Toggle Button */}
      <button
        onClick={toggleMenu}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 touch-manipulation ${
          isOpen 
            ? 'bg-cyan-500 text-[#0b0f14] rotate-90 scale-95 shadow-[0_0_20px_rgba(6,182,212,0.4)]' 
            : 'bg-[#0b0f14]/90 border border-slate-600 text-cyan-400 backdrop-blur-xl'
        }`}
      >
        <MoreVertical size={24} />
      </button>

    </div>
  );
}
