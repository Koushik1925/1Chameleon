import * as Icons from 'lucide-react';

export default function FeatureCard({ title, description, icon, status, category }) {
    const IconComponent = Icons[icon] || Icons.Zap;

    return (
        <div className="group liquid-glass-card rounded-3xl p-7 flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl liquid-glass-badge flex items-center justify-center text-[#9CA3AF] group-hover:scale-105 group-hover:text-[#06B6D4] transition-all duration-250">
                        <IconComponent size={22} />
                    </div>

                    {status === 'Coming Soon' ? (
                        <span className="px-2.5 py-1 rounded-full liquid-glass-badge text-[#9CA3AF] text-[10px] font-mono uppercase tracking-[0.12em]">
                            Coming Soon
                        </span>
                    ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-950/20 border border-emerald-500/20 text-[#22C55E] text-[10px] font-mono uppercase tracking-[0.12em] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse"></span>
                            Live
                        </span>
                    )}
                </div>

                <h3 className="text-lg font-bold text-[#F3F4F6] mb-2.5 group-hover:text-cyan-400 transition-colors duration-200">
                    {title}
                </h3>

                <p className="text-[#9CA3AF] text-xs leading-relaxed mb-5">
                    {description}
                </p>
            </div>

            {category && (
                <div className="pt-3 border-t border-white/8 text-[10px] font-mono text-[#9CA3AF]/60 uppercase tracking-[0.12em]">
                    {category}
                </div>
            )}
        </div>
    );
}
