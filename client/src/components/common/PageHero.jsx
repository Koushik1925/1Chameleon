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
            {/* Apple Liquid Glass Ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-[#22C55E]/5 via-[#06B6D4]/5 to-[#8B5CF6]/4 blur-[140px] rounded-full pointer-events-none"></div>

            <div className="max-w-[900px] mx-auto relative z-10 space-y-6">
                {badge && (
                    <div className="inline-flex items-center gap-2 text-[#06B6D4] text-[10px] sm:text-xs font-mono font-semibold uppercase tracking-[0.12em] liquid-glass-badge px-3.5 py-1.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse"></span>
                        {badge}
                    </div>
                )}

                <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-[#F3F4F6] leading-tight">
                    {title}{' '}{titleGradient && (
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22C55E] via-[#06B6D4] to-[#8B5CF6] block sm:inline">
                            {titleGradient}
                        </span>
                    )}
                </h1>

                {subtitle && (
                    <p className="text-base sm:text-lg md:text-xl text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
                        {subtitle}
                    </p>
                )}

                {(ctaText || secondaryCtaText) && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                        {ctaText && (
                            <Link 
                                to={ctaLink || '/connect'} 
                                className="h-12 px-8 rounded-2xl liquid-glass-btn-primary text-white font-bold flex items-center justify-center text-sm"
                            >
                                {ctaText}
                            </Link>
                        )}

                        {secondaryCtaText && (
                            <Link 
                                to={secondaryCtaLink || '/downloads'} 
                                className="h-12 px-8 rounded-2xl liquid-glass-btn-secondary text-[#F3F4F6] font-semibold text-sm flex items-center justify-center"
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
