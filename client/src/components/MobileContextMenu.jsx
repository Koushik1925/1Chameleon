import React, { useEffect, useState } from 'react';

export default function MobileContextMenu({ isOpen, position, onClose, onAction }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Small delay to allow the DOM element to mount before sliding in
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAction = (action) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([30]);
    onAction(action);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center touch-none">
      {/* Dark overlay */}
      <div 
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      
      {/* Action Sheet */}
      <div 
        className={`relative w-full max-w-sm mb-[env(safe-area-inset-bottom)] bg-[#111827] rounded-t-3xl border-t border-slate-700 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="p-2 flex justify-center">
          <div className="w-12 h-1.5 bg-slate-600 rounded-full"></div>
        </div>
        
        <div className="flex flex-col p-4 gap-2">
          <button onClick={() => handleAction('cut')} className="w-full text-left px-5 py-4 bg-white/5 hover:bg-white/10 active:bg-white/20 rounded-xl font-medium text-white transition-colors">
            Cut
          </button>
          <button onClick={() => handleAction('copy')} className="w-full text-left px-5 py-4 bg-white/5 hover:bg-white/10 active:bg-white/20 rounded-xl font-medium text-white transition-colors">
            Copy
          </button>
          <button onClick={() => handleAction('paste')} className="w-full text-left px-5 py-4 bg-white/5 hover:bg-white/10 active:bg-white/20 rounded-xl font-medium text-white transition-colors">
            Paste
          </button>
          <button onClick={() => handleAction('rename')} className="w-full text-left px-5 py-4 bg-white/5 hover:bg-white/10 active:bg-white/20 rounded-xl font-medium text-white transition-colors">
            Rename
          </button>
          
          <div className="h-px bg-slate-700 my-2"></div>
          
          <button onClick={onClose} className="w-full text-center px-5 py-4 text-slate-400 hover:text-white font-bold transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
