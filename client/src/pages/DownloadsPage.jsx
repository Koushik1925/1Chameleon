import SEOHead from '../components/common/SEOHead';
import PageHero from '../components/common/PageHero';
import Accordion from '../components/common/Accordion';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { FAQS_DATA } from '../constants/data';
import { Monitor, Apple, Terminal, Download, ShieldCheck, CheckCircle2, Cpu, HardDrive, Wifi } from 'lucide-react';

export default function DownloadsPage() {
    return (
        <div className="min-h-screen bg-[#0B0F1A] text-[#E5E7EB] font-sans selection:bg-[#06B6D4]/30 selection:text-cyan-200">
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
                <section className="pb-16 px-6 max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        
                        {/* Windows Card (Available) */}
                        <div className="bg-[#111827] border-2 border-[#06B6D4]/50 rounded-2xl p-8 backdrop-blur-xl relative overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col justify-between hover:border-[#06B6D4] transition-all">
                            <div className="absolute top-0 right-0 bg-[#06B6D4] text-black font-bold text-[10px] font-mono tracking-widest px-3 py-1 rounded-bl-xl uppercase">
                                Available Now
                            </div>

                            <div>
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#22C55E]/20 via-[#06B6D4]/20 to-[#8B5CF6]/20 border border-[#1F2937] flex items-center justify-center text-[#06B6D4] mb-6">
                                    <Monitor size={32} />
                                </div>

                                <h3 className="text-2xl font-bold text-[#E5E7EB] mb-2">Windows</h3>
                                <p className="text-[#9CA3AF] text-sm mb-6 leading-relaxed">
                                    Full support for Windows 10 and Windows 11 (64-bit). Includes auto-start service and NVENC GPU acceleration.
                                </p>

                                <div className="space-y-2 mb-8 text-xs text-[#E5E7EB]">
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
                                className="w-full h-12 bg-gradient-to-r from-[#22C55E] to-[#06B6D4] hover:opacity-95 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)] active:scale-98 transition-all"
                            >
                                <Download size={20} />
                                Download for Windows (v1.5.0)
                            </a>
                        </div>

                        {/* macOS Card (Coming Soon) */}
                        <div className="bg-[#111827]/70 border border-[#1F2937] rounded-2xl p-8 backdrop-blur-xl relative opacity-75 flex flex-col justify-between">
                            <div className="absolute top-0 right-0 bg-[#0B0F1A] border border-[#1F2937] text-[#9CA3AF] text-[10px] font-mono tracking-widest px-3 py-1 rounded-bl-xl uppercase">
                                Coming Soon
                            </div>

                            <div>
                                <div className="w-14 h-14 rounded-xl bg-[#0B0F1A] border border-[#1F2937] flex items-center justify-center text-[#9CA3AF] mb-6">
                                    <Apple size={32} />
                                </div>

                                <h3 className="text-2xl font-bold text-[#E5E7EB] mb-2">macOS</h3>
                                <p className="text-[#9CA3AF] text-sm mb-6 leading-relaxed">
                                    Native Metal framework acceleration for Apple Silicon (M1/M2/M3) and Intel Macs.
                                </p>
                            </div>

                            <button disabled className="w-full h-12 bg-[#0B0F1A] text-[#9CA3AF] font-medium rounded-xl cursor-not-allowed border border-[#1F2937]">
                                macOS Preview Coming Soon
                            </button>
                        </div>

                        {/* Linux Card (Coming Soon) */}
                        <div className="bg-[#111827]/70 border border-[#1F2937] rounded-2xl p-8 backdrop-blur-xl relative opacity-75 flex flex-col justify-between">
                            <div className="absolute top-0 right-0 bg-[#0B0F1A] border border-[#1F2937] text-[#9CA3AF] text-[10px] font-mono tracking-widest px-3 py-1 rounded-bl-xl uppercase">
                                Coming Soon
                            </div>

                            <div>
                                <div className="w-14 h-14 rounded-xl bg-[#0B0F1A] border border-[#1F2937] flex items-center justify-center text-[#9CA3AF] mb-6">
                                    <Terminal size={32} />
                                </div>

                                <h3 className="text-2xl font-bold text-[#E5E7EB] mb-2">Linux</h3>
                                <p className="text-[#9CA3AF] text-sm mb-6 leading-relaxed">
                                    Headless and X11/Wayland host daemon packages for Ubuntu, Debian, Fedora, and Arch.
                                </p>
                            </div>

                            <button disabled className="w-full h-12 bg-[#0B0F1A] text-[#9CA3AF] font-medium rounded-xl cursor-not-allowed border border-[#1F2937]">
                                Linux Build Coming Soon
                            </button>
                        </div>

                    </div>
                </section>

                {/* Requirements & Hardware Section */}
                <section className="py-16 px-6 max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        
                        {/* Minimum Requirements */}
                        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8 backdrop-blur-xl space-y-4">
                            <h3 className="text-xl font-bold text-[#E5E7EB] flex items-center gap-2">
                                <Cpu className="text-[#06B6D4]" size={20} />
                                Minimum System Requirements
                            </h3>
                            <ul className="space-y-3 text-[#9CA3AF] text-sm">
                                <li className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                                    <span className="text-[#9CA3AF]">Operating System</span>
                                    <span className="font-semibold text-[#E5E7EB]">Windows 10 / 11 (64-bit)</span>
                                </li>
                                <li className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                                    <span className="text-[#9CA3AF]">Architecture</span>
                                    <span className="font-semibold text-[#E5E7EB]">x64 Processor</span>
                                </li>
                                <li className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                                    <span className="text-[#9CA3AF]">RAM</span>
                                    <span className="font-semibold text-[#E5E7EB]">4 GB RAM</span>
                                </li>
                                <li className="flex items-center justify-between">
                                    <span className="text-[#9CA3AF]">Network</span>
                                    <span className="font-semibold text-[#E5E7EB]">Broadband Internet Connection</span>
                                </li>
                            </ul>
                        </div>

                        {/* Recommended Hardware */}
                        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8 backdrop-blur-xl space-y-4">
                            <h3 className="text-xl font-bold text-[#E5E7EB] flex items-center gap-2">
                                <HardDrive className="text-[#06B6D4]" size={20} />
                                Recommended Hardware
                            </h3>
                            <ul className="space-y-3 text-[#9CA3AF] text-sm">
                                <li className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                                    <span className="text-[#9CA3AF]">GPU Encoder</span>
                                    <span className="font-semibold text-[#E5E7EB]">NVIDIA NVENC / Intel QuickSync</span>
                                </li>
                                <li className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                                    <span className="text-[#9CA3AF]">Display Resolution</span>
                                    <span className="font-semibold text-[#E5E7EB]">1920x1080 @ 60 FPS</span>
                                </li>
                                <li className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                                    <span className="text-[#9CA3AF]">Network Latency</span>
                                    <span className="font-semibold text-[#E5E7EB]">&lt; 50ms Ping to Signaling Relay</span>
                                </li>
                                <li className="flex items-center justify-between">
                                    <span className="text-[#9CA3AF]">Bandwidth</span>
                                    <span className="font-semibold text-[#E5E7EB]">10+ Mbps Upload Speed</span>
                                </li>
                            </ul>
                        </div>

                    </div>
                </section>

                {/* FAQ Section */}
                <section className="py-16 px-6 max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-[#E5E7EB] text-center mb-10">
                        Download & Installation FAQ
                    </h2>
                    <Accordion items={FAQS_DATA.slice(0, 5)} />
                </section>
            </div>

            <Footer />
        </div>
    );
}
