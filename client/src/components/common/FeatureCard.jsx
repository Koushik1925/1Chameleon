import * as Icons from 'lucide-react';

export default function FeatureCard({ title, description, icon, status, category }) {
    const IconComponent = Icons[icon] || Icons.Zap;

    return (
        <div className="group relative bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 rounded-2xl p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(6,182,212,0.15)] flex flex-col justify-between">
            {/* Top Row: Icon + Badge */}
            <div>
                <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all">
                        <IconComponent size={24} />
                    </div>

                    {status === 'Coming Soon' ? (
                        <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-mono">
                            Coming Soon
                        </span>
                    ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Live
                        </span>
                    )}
                </div>

                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors">
                    {title}
                </h3>

                <p className="text-slate-400 text-sm leading-relaxed mb-4">
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
