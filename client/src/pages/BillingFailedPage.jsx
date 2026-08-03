import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, HelpCircle } from 'lucide-react';
import Navbar from '../components/common/Navbar';

export default function BillingFailedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#090D17] text-[#9CA3AF] flex flex-col justify-center items-center relative overflow-hidden">
      <Navbar />

      <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen bg-grid-pattern z-0" />
      <div className="absolute w-[400px] h-[400px] bg-gradient-to-br from-red-500/10 to-transparent rounded-full filter blur-3xl pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0" />

      <div className="liquid-glass-card rounded-[32px] p-10 max-w-md w-full text-center border border-white/6 shadow-[0_15px_50px_rgba(0,0,0,0.5)] space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-500 mx-4">
        
        {/* Animated Alert Icon */}
        <div className="w-20 h-20 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto shadow-[0_0_40px_rgba(239,68,68,0.15)] relative">
          <div className="absolute inset-0 rounded-full border border-red-500 animate-ping opacity-25" style={{ animationDuration: '2.5s' }}></div>
          <AlertCircle size={36} />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Payment Failed</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            The transaction could not be completed. This can occur due to insufficient funds, authentication issues, or network drops during checkout validation.
          </p>
        </div>

        <div className="h-px bg-white/8" />

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/billing')}
            className="w-full py-3.5 bg-gradient-to-r from-red-500 to-amber-500 text-white rounded-2xl text-xs font-bold shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Try Again</span>
          </button>
          
          <button
            onClick={() => navigate('/contact')}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <HelpCircle size={14} />
            <span>Contact Support</span>
          </button>
        </div>
      </div>
    </div>
  );
}
