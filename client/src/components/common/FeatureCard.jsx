import * as Icons from 'lucide-react';

export default function FeatureCard({ title, description, icon, status, category }) {
    const IconComponent = Icons[icon] || Icons.Zap;

    return (
        <div className="group relative bg-[#111827] border border-[#1F2937] hover:border-[#06B6D4]/50 rounded-2xl p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(6,182,212,0.15)] flex flex-col justify-between">
            {/* Top Row: Icon + Badge */}
            <div>
                <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#22C55E]/10 via-[#06B6D4]/10 to-[#8B5CF6]/10 border border-[#1F2937] flex items-center justify-center text-[#06B6D4] group-hover:scale-110 group-hover:border-[#06B6D4]/40 transition-all">
                        <IconComponent size={24} className="text-[#06B6D4]" />
                    </div>

                    {status === 'Coming Soon' ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#0B0F1A] border border-[#1F2937] text-[#9CA3AF] text-xs font-mono">
                            Coming Soon
                        </span>
                    ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-950/30 border border-emerald-500/20 text-[#22C55E] text-xs font-mono flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"></span>
                            Live
                        </span>
                    )}
                </div>

                <h3 className="text-xl font-bold text-[#E5E7EB] mb-3 group-hover:text-[#06B6D4] transition-colors">
                    {title}
                </h3>

                <p className="text-[#9CA3AF] text-sm leading-relaxed mb-6">
                    {description}
                </p>
            </div>

            {category && (
                <div className="pt-4 border-t border-slate-800/60 text-xs font-mono text-slate-500">
                    {category}
                </div>
            )}
        </div>
    );
}
