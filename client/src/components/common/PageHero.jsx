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
        <section className="pt-36 pb-20 px-6 text-center relative overflow-hidden">
            {/* Ambient Background Glow behind headline */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-[#22C55E]/4 to-[#06B6D4]/4 blur-[130px] rounded-full pointer-events-none"></div>

            <div className="max-w-[900px] mx-auto relative z-10">
                {badge && (
                    <div className="inline-flex items-center gap-2 text-[#06B6D4] text-xs md:text-sm font-mono font-semibold uppercase tracking-[0.15em] mb-6">
                        <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></span>
                        {badge}
                    </div>
                )}

                <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-[#F3F4F6] mb-8 leading-tight">
                    {title} {titleGradient && (
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22C55E] via-[#06B6D4] to-[#8B5CF6] block sm:inline">
                            {titleGradient}
                        </span>
                    )}
                </h1>

                {subtitle && (
                    <p className="text-lg md:text-xl text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed mb-10">
                        {subtitle}
                    </p>
                )}

                {(ctaText || secondaryCtaText) && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        {ctaText && (
                            <Link 
                                to={ctaLink || '/connect'} 
                                className="h-12 px-8 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#06B6D4] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(6,182,212,0.3)] text-white font-bold flex items-center justify-center active:scale-98 transition-all duration-150 ease-out"
                            >
                                {ctaText}
                            </Link>
                        )}

                        {secondaryCtaText && (
                            <Link 
                                to={secondaryCtaLink || '/downloads'} 
                                className="h-12 px-8 rounded-xl bg-transparent hover:bg-white/5 text-[#F3F4F6] font-semibold flex items-center justify-center border border-white/8 active:scale-98 transition-all duration-150 ease-out"
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
