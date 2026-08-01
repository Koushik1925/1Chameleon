import SEOHead from '../components/common/SEOHead';
import PageHero from '../components/common/PageHero';
import Accordion from '../components/common/Accordion';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { FAQS_DATA } from '../constants/data';
import { Monitor, Apple, Terminal, Download, ShieldCheck, CheckCircle2, Cpu, HardDrive } from 'lucide-react';

export default function DownloadsPage() {
    return (
        <div className="min-h-screen bg-[#090D17] text-[#9CA3AF] font-sans selection:bg-[#06B6D4]/30 selection:text-cyan-200">
            <SEOHead 
                title="Download Desktop Agent" 
                description="Download Chameleon Desktop Agent for Windows 10 & 11. Ultra-low latency remote desktop host software with automatic pair code generation."
                canonical="https://chameleon-jet.vercel.app/downloads"
            />
            <Navbar />

            <div className="relative z-10">
                <PageHero 
                    badge="Desktop Agent v1.5.0"
                    title="Download"
                    titleGradient="Chameleon"
                    subtitle="Install the host agent on your computer to allow secure, encrypted remote access from any web browser or mobile phone."
                />

                {/* Main Platforms Section */}
                <section className="pb-20 px-6 bg-[#090D17]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        
                        {/* Windows Card (Available) */}
                        <div className="bg-[#111827]/72 border-2 border-[#06B6D4]/40 rounded-[18px] p-8 backdrop-blur-[12px] relative overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.45)] flex flex-col justify-between hover:border-[#06B6D4]/70 hover:-translate-y-1.5 transition-all duration-150 ease-out">
                            <div className="absolute top-0 right-0 bg-[#06B6D4] text-black font-bold text-[10px] font-mono tracking-[0.15em] px-3 py-1 rounded-bl-xl uppercase">
                                Available Now
                            </div>

                            <div>
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#22C55E]/20 via-[#06B6D4]/20 to-[#8B5CF6]/20 border border-white/6 flex items-center justify-center text-[#06B6D4] mb-6">
                                    <Monitor size={32} />
                                </div>

                                <h3 className="text-2xl font-bold text-[#F3F4F6] mb-2">Windows</h3>
                                <p className="text-[#9CA3AF] text-sm mb-6 leading-relaxed">
                                    Full support for Windows 10 and Windows 11 (64-bit). Includes auto-start service and NVENC GPU acceleration.
                                </p>

                                <div className="space-y-2 mb-8 text-xs text-[#F3F4F6]">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 size={14} className="text-[#22C55E] shrink-0" />
                                        <span>Interactive NSIS Setup Wizard</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 size={14} className="text-[#22C55E] shrink-0" />
                                        <span>Permanent 6-Digit Pair Code</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 size={14} className="text-[#22C55E] shrink-0" />
                                        <span>Auto-Background System Tray</span>
                                    </div>
                                </div>
                            </div>

                            <a 
                                href="https://github.com/Rithvik-krishna/Chameleon/raw/main/agent/dist/Chameleon-Desktop-Agent-Setup-1.5.0.exe" 
                                className="w-full h-12 bg-gradient-to-r from-[#22C55E] to-[#06B6D4] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(6,182,212,0.3)] text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-98 transition-all duration-150 ease-out shadow-md"
                            >
                                <Download size={20} />
                                Download for Windows (v1.5.0)
                            </a>
                        </div>

                        {/* macOS Card (Coming Soon) */}
                        <div className="bg-[#111827]/50 border border-white/5 rounded-[18px] p-8 backdrop-blur-[12px] relative opacity-70 flex flex-col justify-between">
                            <div className="absolute top-0 right-0 bg-[#090D17]/90 border border-white/5 text-[#9CA3AF] text-[10px] font-mono tracking-[0.15em] px-3 py-1 rounded-bl-xl uppercase">
                                Coming Soon
                            </div>

                            <div>
                                <div className="w-14 h-14 rounded-xl bg-[#090D17] border border-white/5 flex items-center justify-center text-[#9CA3AF] mb-6">
                                    <Apple size={32} />
                                </div>

                                <h3 className="text-2xl font-bold text-[#F3F4F6] mb-2">macOS</h3>
                                <p className="text-[#9CA3AF] text-sm mb-6 leading-relaxed">
                                    Native Metal framework acceleration for Apple Silicon (M1/M2/M3) and Intel Macs.
                                </p>
                            </div>

                            <button disabled className="w-full h-12 bg-[#090D17]/60 text-[#9CA3AF] font-medium rounded-xl cursor-not-allowed border border-white/5">
                                macOS Preview Coming Soon
                            </button>
                        </div>

                        {/* Linux Card (Coming Soon) */}
                        <div className="bg-[#111827]/50 border border-white/5 rounded-[18px] p-8 backdrop-blur-[12px] relative opacity-70 flex flex-col justify-between">
                            <div className="absolute top-0 right-0 bg-[#090D17]/90 border border-white/5 text-[#9CA3AF] text-[10px] font-mono tracking-[0.15em] px-3 py-1 rounded-bl-xl uppercase">
                                Coming Soon
                            </div>

                            <div>
                                <div className="w-14 h-14 rounded-xl bg-[#090D17] border border-white/5 flex items-center justify-center text-[#9CA3AF] mb-6">
                                    <Terminal size={32} />
                                </div>

                                <h3 className="text-2xl font-bold text-[#F3F4F6] mb-2">Linux</h3>
                                <p className="text-[#9CA3AF] text-sm mb-6 leading-relaxed">
                                    Headless and X11/Wayland host daemon packages for Ubuntu, Debian, Fedora, and Arch.
                                </p>
                            </div>

                            <button disabled className="w-full h-12 bg-[#090D17]/60 text-[#9CA3AF] font-medium rounded-xl cursor-not-allowed border border-white/5">
                                Linux Build Coming Soon
                            </button>
                        </div>

                    </div>
                </section>

                {/* Requirements & Hardware Section */}
                <section className="py-20 px-6 border-t border-white/5 bg-[#0D1320]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        
                        {/* Minimum Requirements */}
                        <div className="bg-[#111827]/72 border border-white/6 rounded-[18px] p-8 backdrop-blur-[12px] space-y-4 transition-all duration-150 ease-out hover:-translate-y-1.5 hover:border-[#06B6D4]/35 hover:shadow-[0_15px_40px_rgba(0,0,0,0.45)]">
                            <h3 className="text-xl font-bold text-[#F3F4F6] flex items-center gap-2">
                                <Cpu className="text-[#06B6D4]" size={20} />
                                Minimum System Requirements
                            </h3>
                            <ul className="space-y-3 text-[#9CA3AF] text-sm">
                                <li className="flex items-center justify-between border-b border-white/5 pb-2">
                                    <span className="text-[#9CA3AF]">Operating System</span>
                                    <span className="font-semibold text-[#F3F4F6]">Windows 10 / 11 (64-bit)</span>
                                </li>
                                <li className="flex items-center justify-between border-b border-white/5 pb-2">
                                    <span className="text-[#9CA3AF]">Architecture</span>
                                    <span className="font-semibold text-[#F3F4F6]">x64 Processor</span>
                                </li>
                                <li className="flex items-center justify-between border-b border-white/5 pb-2">
                                    <span className="text-[#9CA3AF]">RAM</span>
                                    <span className="font-semibold text-[#F3F4F6]">4 GB RAM</span>
                                </li>
                                <li className="flex items-center justify-between">
                                    <span className="text-[#9CA3AF]">Network</span>
                                    <span className="font-semibold text-[#F3F4F6]">Broadband Internet Connection</span>
                                </li>
                            </ul>
                        </div>

                        {/* Recommended Hardware */}
                        <div className="bg-[#111827]/72 border border-white/6 rounded-[18px] p-8 backdrop-blur-[12px] space-y-4 transition-all duration-150 ease-out hover:-translate-y-1.5 hover:border-[#06B6D4]/35 hover:shadow-[0_15px_40px_rgba(0,0,0,0.45)]">
                            <h3 className="text-xl font-bold text-[#F3F4F6] flex items-center gap-2">
                                <HardDrive className="text-[#06B6D4]" size={20} />
                                Recommended Hardware
                            </h3>
                            <ul className="space-y-3 text-[#9CA3AF] text-sm">
                                <li className="flex items-center justify-between border-b border-white/5 pb-2">
                                    <span className="text-[#9CA3AF]">GPU Encoder</span>
                                    <span className="font-semibold text-[#F3F4F6]">NVIDIA NVENC / Intel QuickSync</span>
                                </li>
                                <li className="flex items-center justify-between border-b border-white/5 pb-2">
                                    <span className="text-[#9CA3AF]">Display Resolution</span>
                                    <span className="font-semibold text-[#F3F4F6]">1920x1080 @ 60 FPS</span>
                                </li>
                                <li className="flex items-center justify-between border-b border-white/5 pb-2">
                                    <span className="text-[#9CA3AF]">Network Latency</span>
                                    <span className="font-semibold text-[#F3F4F6]">&lt; 50ms Ping to Signaling Relay</span>
                                </li>
                                <li className="flex items-center justify-between">
                                    <span className="text-[#9CA3AF]">Bandwidth</span>
                                    <span className="font-semibold text-[#F3F4F6]">10+ Mbps Upload Speed</span>
                                </li>
                            </ul>
                        </div>

                    </div>
                </section>

                {/* FAQ Section */}
                <section className="py-20 px-6 border-t border-white/5 bg-[#090D17]">
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
