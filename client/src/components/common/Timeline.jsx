import { CheckCircle2, AlertCircle, PlusCircle, Wrench } from 'lucide-react';

export default function Timeline({ releases = [] }) {
    return (
        <div className="space-y-12 max-w-4xl mx-auto">
            {releases.map((rel, idx) => (
                <div key={idx} className="relative pl-8 md:pl-10 border-l border-[#1F2937] space-y-6">
                    {/* Gradient Dot Node */}
                    <div className="absolute -left-2.5 top-1 w-5 h-5 rounded-full bg-gradient-to-tr from-[#22C55E] to-[#06B6D4] shadow-[0_0_12px_rgba(6,182,212,0.4)]"></div>

                    {/* Release Header */}
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl md:text-3xl font-bold text-[#E5E7EB] tracking-tight">
                            {rel.version}
                        </h2>
                        <span className="text-xs font-mono text-[#9CA3AF] bg-[#111827] border border-[#1F2937] px-2.5 py-1 rounded-full">
                            {rel.date}
                        </span>
                        {rel.badge && (
                            <span className="text-xs font-mono text-[#06B6D4] bg-[#111827] border border-[#1F2937] px-3 py-1 rounded-full font-semibold">
                                {rel.badge}
                            </span>
                        )}
                    </div>

                    {/* Content Card */}
                    <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 md:p-8 backdrop-blur-xl space-y-6">
                        
                        {/* Added Features */}
                        {rel.added && rel.added.length > 0 && (
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-400 mb-3 uppercase tracking-wider font-mono">
                                    <PlusCircle size={16} />
                                    Added
                                </h4>
                                <ul className="space-y-2">
                                    {rel.added.map((item, i) => (
                                        <li key={i} className="text-slate-300 text-sm leading-relaxed flex items-start gap-2.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0"></span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Improved */}
                        {rel.improved && rel.improved.length > 0 && (
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-cyan-400 mb-3 uppercase tracking-wider font-mono">
                                    <Wrench size={16} />
                                    Improved
                                </h4>
                                <ul className="space-y-2">
                                    {rel.improved.map((item, i) => (
                                        <li key={i} className="text-slate-300 text-sm leading-relaxed flex items-start gap-2.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0"></span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Fixed */}
                        {rel.fixed && rel.fixed.length > 0 && (
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-400 mb-3 uppercase tracking-wider font-mono">
                                    <CheckCircle2 size={16} />
                                    Fixed
                                </h4>
                                <ul className="space-y-2">
                                    {rel.fixed.map((item, i) => (
                                        <li key={i} className="text-slate-300 text-sm leading-relaxed flex items-start gap-2.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"></span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Known Issues */}
                        {rel.knownIssues && rel.knownIssues.length > 0 && (
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-400 mb-3 uppercase tracking-wider font-mono">
                                    <AlertCircle size={16} />
                                    Known Preview Issues
                                </h4>
                                <ul className="space-y-2">
                                    {rel.knownIssues.map((item, i) => (
                                        <li key={i} className="text-slate-400 text-sm leading-relaxed flex items-start gap-2.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0"></span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
