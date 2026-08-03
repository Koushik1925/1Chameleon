import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import Navbar from '../components/common/Navbar';

export default function BillingSuccessPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/billing');
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#090D17] text-[#9CA3AF] flex flex-col justify-center items-center relative overflow-hidden">
      <Navbar />

      <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen bg-grid-pattern z-0" />
      <div className="absolute w-[400px] h-[400px] bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-full filter blur-3xl pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0" />

      <div className="liquid-glass-card rounded-[32px] p-10 max-w-md w-full text-center border border-white/6 shadow-[0_15px_50px_rgba(0,0,0,0.5)] space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-500 mx-4">
        
        {/* Animated Spin/Ping Check */}
        <div className="w-20 h-20 rounded-full bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_40px_rgba(16,185,129,0.15)] relative">
          <div className="absolute inset-0 rounded-full border border-emerald-500 animate-ping opacity-25" style={{ animationDuration: '2s' }}></div>
          <ShieldCheck size={36} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 uppercase tracking-wider mx-auto">
            <Sparkles size={11} />
            <span>Premium Unlocked</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Upgrade Successful!</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Thank you for subscribing to Chameleon Pro. All premium limits have been unlocked for your account and paired desktop devices instantly.
          </p>
        </div>

        <div className="h-px bg-white/8" />

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/billing')}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-2xl text-xs font-bold shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Go to Billing Dashboard</span>
            <ArrowRight size={14} />
          </button>
          <span className="text-[10px] text-slate-500 font-mono">Redirecting automatically in 5 seconds...</span>
        </div>
      </div>
    </div>
  );
}
