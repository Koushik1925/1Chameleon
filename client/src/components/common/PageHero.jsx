import React from 'react';
import { Link } from 'react-router-dom';

export default function PageHero({ 
    badge = '', 
    title = '', 
    titleGradient = '', 
    subtitle = '', 
    ctaText = '', 
    ctaLink = '',
    secondaryCtaText = '',
    secondaryCtaLink = ''
}) {
    return (
        <section className="pt-32 pb-16 px-6 text-center relative overflow-hidden">
            {/* Ambient Background Glow - Soft & Minimal */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-[#06B6D4]/5 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="max-w-4xl mx-auto relative z-10">
                {badge && (
                    <div className="inline-flex items-center gap-2 text-[#06B6D4] text-xs md:text-sm font-mono font-semibold uppercase tracking-widest mb-4">
                        <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></span>
                        {badge}
                    </div>
                )}

                <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-[#E5E7EB] mb-6 leading-tight">
                    {title} {titleGradient && (
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22C55E] via-[#06B6D4] to-[#8B5CF6] block sm:inline">
                            {titleGradient}
                        </span>
                    )}
                </h1>

                {subtitle && (
                    <p className="text-lg md:text-xl text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed mb-8">
                        {subtitle}
                    </p>
                )}

                {(ctaText || secondaryCtaText) && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        {ctaText && (
                            <Link 
                                to={ctaLink || '/connect'} 
                                className="h-12 px-8 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#06B6D4] hover:opacity-95 text-white font-bold flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.25)] active:scale-98 transition-all"
                            >
                                {ctaText}
                            </Link>
                        )}

                        {secondaryCtaText && (
                            <Link 
                                to={secondaryCtaLink || '/downloads'} 
                                className="h-12 px-8 rounded-xl bg-transparent hover:bg-[#111827] text-[#E5E7EB] font-semibold flex items-center justify-center border border-[#1F2937] hover:border-slate-700 transition-all"
                            >
                                {secondaryCtaText}
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
