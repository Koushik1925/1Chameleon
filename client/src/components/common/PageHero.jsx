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
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-900/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="max-w-4xl mx-auto relative z-10">
                {badge && (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-6">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                        {badge}
                    </div>
                )}

                <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-tight">
                    {title} {titleGradient && (
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 block sm:inline">
                            {titleGradient}
                        </span>
                    )}
                </h1>

                {subtitle && (
                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8">
                        {subtitle}
                    </p>
                )}

                {(ctaText || secondaryCtaText) && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        {ctaText && (
                            <Link 
                                to={ctaLink || '/connect'} 
                                className="h-12 px-8 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.5)] transition-all"
                            >
                                {ctaText}
                            </Link>
                        )}

                        {secondaryCtaText && (
                            <Link 
                                to={secondaryCtaLink || '/downloads'} 
                                className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium flex items-center justify-center border border-slate-800 hover:border-slate-700 transition-all"
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
