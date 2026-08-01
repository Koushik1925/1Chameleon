import * as Icons from 'lucide-react';

export default function FeatureCard({ title, description, icon, status, category }) {
    const IconComponent = Icons[icon] || Icons.Zap;

    return (
        <div className="group relative bg-[#111827]/72 border border-white/6 rounded-[18px] p-7 backdrop-blur-[12px] transition-all duration-150 ease-out hover:-translate-y-1.5 hover:border-[#06B6D4]/35 hover:shadow-[0_15px_40px_rgba(0,0,0,0.45)] flex flex-col justify-between">
            {/* Top Row: Icon + Badge */}
            <div>
                <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-[#090D17] border border-white/5 flex items-center justify-center text-[#9CA3AF] group-hover:scale-105 group-hover:border-[#06B6D4]/30 group-hover:text-[#06B6D4] transition-all duration-150 ease-out">
                        <IconComponent size={24} />
                    </div>

                    {status === 'Coming Soon' ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#090D17] border border-white/5 text-[#9CA3AF] text-xs font-mono uppercase tracking-[0.15em]">
                            Coming Soon
                        </span>
                    ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-950/20 border border-emerald-500/20 text-[#22C55E] text-xs font-mono uppercase tracking-[0.15em] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse"></span>
                            Live
                        </span>
                    )}
                </div>

                <h3 className="text-xl font-bold text-[#F3F4F6] mb-3 group-hover:text-[#06B6D4] transition-all duration-150 ease-out">
                    {title}
                </h3>

                <p className="text-[#9CA3AF] text-sm leading-relaxed mb-6">
                    {description}
                </p>
            </div>

            {category && (
                <div className="pt-4 border-t border-white/5 text-xs font-mono text-[#9CA3AF]/60 uppercase tracking-[0.15em]">
                    {category}
                </div>
            )}
        </div>
    );
}
