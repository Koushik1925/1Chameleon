import SEOHead from '../components/common/SEOHead';
import PageHero from '../components/common/PageHero';
import Accordion from '../components/common/Accordion';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { FAQS_DATA } from '../constants/data';
import { Monitor, Apple, Terminal, Download, CheckCircle2, Cpu, HardDrive } from 'lucide-react';

export default function DownloadsPage() {
    return (
        <div className="min-h-screen bg-[#090D17] text-[#9CA3AF] font-sans selection:bg-[#06B6D4]/30 selection:text-cyan-200">
            <SEOHead
                title="Download Desktop Agent"
                description="Download Chameleon Desktop Agent for Windows 10 & 11. Ultra-low latency remote desktop host software with automatic pair code generation."
                canonical="https://www.chameleon-agent.online/downloads"
            />
            <Navbar />

            <div className="relative z-10">
                <PageHero
                    badge="Desktop Agent v1.5.1"
                    title="Download"
                    titleGradient="Chameleon"
                    subtitle="Install the host agent on your computer to allow secure, encrypted remote access from any web browser or mobile phone."
                />

                {/* Platform Cards */}
                <section className="pb-20 px-6 bg-[#090D17]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">

                        {/* Windows Card — Active */}
                        <div className="liquid-glass-card rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between border border-cyan-400/25 shadow-[0_0_40px_rgba(6,182,212,0.08)]">
                            <div className="absolute top-0 right-0 bg-gradient-to-r from-[#22C55E] to-[#06B6D4] text-black font-bold text-[9px] font-mono tracking-[0.15em] px-3 py-1 rounded-bl-2xl uppercase">
                                Available Now
                            </div>

                            <div>
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#22C55E]/20 via-[#06B6D4]/20 to-[#8B5CF6]/20 border border-white/8 flex items-center justify-center text-[#06B6D4] mb-6">
                                    <Monitor size={30} />
                                </div>

                                <h3 className="text-2xl font-bold text-[#F3F4F6] mb-2">Windows</h3>
                                <p className="text-[#9CA3AF] text-sm mb-6 leading-relaxed">
                                    Full support for Windows 10 and Windows 11 (64-bit). Includes auto-start service and NVENC GPU acceleration.
                                </p>

                                <div className="space-y-2 mb-8">
                                    {['Interactive NSIS Setup Wizard', 'Permanent 6-Digit Pair Code', 'Auto-Background System Tray'].map(f => (
                                        <div key={f} className="flex items-center gap-2 text-xs text-[#F3F4F6]">
                                            <CheckCircle2 size={13} className="text-[#22C55E] shrink-0" />
                                            <span>{f}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <a
                                href="/Chameleon-Desktop-Agent-Setup-1.5.1.exe"
                                download
                                className="w-full h-12 liquid-glass-btn-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-sm"
                            >
                                <Download size={18} />
                                Download for Windows (v1.5.1)
                            </a>
                        </div>

                        {/* macOS Card — Coming Soon */}
                        <div className="liquid-glass-card rounded-3xl p-8 relative opacity-60 flex flex-col justify-between">
                            <div className="absolute top-0 right-0 liquid-glass-badge text-[#9CA3AF] text-[9px] font-mono tracking-[0.15em] px-3 py-1 rounded-bl-2xl uppercase">
                                Coming Soon
                            </div>

                            <div>
                                <div className="w-14 h-14 rounded-2xl liquid-glass-badge flex items-center justify-center text-[#9CA3AF] mb-6">
                                    <Apple size={30} />
                                </div>
                                <h3 className="text-2xl font-bold text-[#F3F4F6] mb-2">macOS</h3>
                                <p className="text-[#9CA3AF] text-sm mb-6 leading-relaxed">
                                    Native Metal framework acceleration for Apple Silicon (M1/M2/M3) and Intel Macs.
                                </p>
                            </div>

                            <button disabled className="w-full h-12 liquid-glass-btn-secondary text-[#9CA3AF] font-medium rounded-2xl cursor-not-allowed text-sm">
                                macOS Preview Coming Soon
                            </button>
                        </div>

                        {/* Linux Card — Coming Soon */}
                        <div className="liquid-glass-card rounded-3xl p-8 relative opacity-60 flex flex-col justify-between">
                            <div className="absolute top-0 right-0 liquid-glass-badge text-[#9CA3AF] text-[9px] font-mono tracking-[0.15em] px-3 py-1 rounded-bl-2xl uppercase">
                                Coming Soon
                            </div>

                            <div>
                                <div className="w-14 h-14 rounded-2xl liquid-glass-badge flex items-center justify-center text-[#9CA3AF] mb-6">
                                    <Terminal size={30} />
                                </div>
                                <h3 className="text-2xl font-bold text-[#F3F4F6] mb-2">Linux</h3>
                                <p className="text-[#9CA3AF] text-sm mb-6 leading-relaxed">
                                    Headless and X11/Wayland host daemon packages for Ubuntu, Debian, Fedora, and Arch.
                                </p>
                            </div>

                            <button disabled className="w-full h-12 liquid-glass-btn-secondary text-[#9CA3AF] font-medium rounded-2xl cursor-not-allowed text-sm">
                                Linux Build Coming Soon
                            </button>
                        </div>

                    </div>
                </section>

                {/* Requirements & Hardware */}
                <section className="py-20 px-6 border-t border-white/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">

                        <div className="liquid-glass-card rounded-3xl p-8 space-y-4">
                            <h3 className="text-xl font-bold text-[#F3F4F6] flex items-center gap-2">
                                <Cpu className="text-[#06B6D4]" size={20} />
                                Minimum System Requirements
                            </h3>
                            <ul className="space-y-3 text-sm">
                                {[
                                    ['Operating System', 'Windows 10 / 11 (64-bit)'],
                                    ['Architecture', 'x64 Processor'],
                                    ['RAM', '4 GB RAM'],
                                    ['Network', 'Broadband Internet Connection']
                                ].map(([label, value]) => (
                                    <li key={label} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                        <span className="text-[#9CA3AF]">{label}</span>
                                        <span className="font-semibold text-[#F3F4F6] text-right">{value}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="liquid-glass-card rounded-3xl p-8 space-y-4">
                            <h3 className="text-xl font-bold text-[#F3F4F6] flex items-center gap-2">
                                <HardDrive className="text-[#06B6D4]" size={20} />
                                Recommended Hardware
                            </h3>
                            <ul className="space-y-3 text-sm">
                                {[
                                    ['GPU Encoder', 'NVIDIA NVENC / Intel QuickSync'],
                                    ['Display', '1920x1080 @ 60 FPS'],
                                    ['Latency', '< 50ms Ping to Relay'],
                                    ['Bandwidth', '10+ Mbps Upload Speed']
                                ].map(([label, value]) => (
                                    <li key={label} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                        <span className="text-[#9CA3AF]">{label}</span>
                                        <span className="font-semibold text-[#F3F4F6] text-right">{value}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                    </div>
                </section>

                {/* FAQ Section */}
                <section className="py-20 px-6 border-t border-white/5">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-3xl font-bold text-[#F3F4F6] text-center mb-12 tracking-tight">
                            Download &amp; Installation FAQ
                        </h2>
                        <Accordion items={FAQS_DATA.slice(0, 5)} />
                    </div>
                </section>
            </div>

            <Footer />
        </div>
    );
}
