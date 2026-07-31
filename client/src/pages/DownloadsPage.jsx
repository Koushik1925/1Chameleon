import SEOHead from '../components/common/SEOHead';
import PageHero from '../components/common/PageHero';
import Accordion from '../components/common/Accordion';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { FAQS_DATA } from '../constants/data';
import { Monitor, Apple, Terminal, Download, ShieldCheck, CheckCircle2, Cpu, HardDrive, Wifi } from 'lucide-react';

export default function DownloadsPage() {
    return (
        <div className="min-h-screen bg-[#0b0f14] text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
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
                        <div className="bg-gradient-to-b from-cyan-950/30 via-slate-900 to-slate-900 border-2 border-cyan-500/40 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.15)] flex flex-col justify-between">
                            <div className="absolute top-0 right-0 bg-cyan-500 text-black font-bold text-[10px] font-mono tracking-widest px-3 py-1 rounded-bl-xl uppercase">
                                Available Now
                            </div>

                            <div>
                                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6">
                                    <Monitor size={32} />
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-2">Windows</h3>
                                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                    Full support for Windows 10 and Windows 11 (64-bit). Includes auto-start service and NVENC GPU acceleration.
                                </p>

                                <div className="space-y-2 mb-8 text-xs text-slate-300">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
                                        <span>Interactive NSIS Setup Wizard</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
                                        <span>Permanent 6-Digit Pair Code</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
                                        <span>Auto-Background System Tray</span>
                                    </div>
                                </div>
                            </div>

                            <a 
                                href="https://github.com/Rithvik-krishna/Chameleon/raw/main/agent/dist/Chameleon-Desktop-Agent-Setup-1.5.0.exe" 
                                className="w-full h-13 bg-cyan-400 hover:bg-cyan-300 text-black font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
                            >
                                <Download size={20} />
                                Download for Windows (v1.5.0)
                            </a>
                        </div>

                        {/* macOS Card (Coming Soon) */}
                        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl relative opacity-85 flex flex-col justify-between">
                            <div className="absolute top-0 right-0 bg-slate-800 text-slate-400 text-[10px] font-mono tracking-widest px-3 py-1 rounded-bl-xl uppercase">
                                Coming Soon
                            </div>

                            <div>
                                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mb-6">
                                    <Apple size={32} />
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-2">macOS</h3>
                                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                    Native Metal framework acceleration for Apple Silicon (M1/M2/M3) and Intel Macs.
                                </p>
                            </div>

                            <button disabled className="w-full h-12 bg-slate-800 text-slate-500 font-medium rounded-xl cursor-not-allowed border border-slate-700/50">
                                macOS Preview Coming Soon
                            </button>
                        </div>

                        {/* Linux Card (Coming Soon) */}
                        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl relative opacity-85 flex flex-col justify-between">
                            <div className="absolute top-0 right-0 bg-slate-800 text-slate-400 text-[10px] font-mono tracking-widest px-3 py-1 rounded-bl-xl uppercase">
                                Coming Soon
                            </div>

                            <div>
                                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mb-6">
                                    <Terminal size={32} />
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-2">Linux</h3>
                                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                    Headless and X11/Wayland host daemon packages for Ubuntu, Debian, Fedora, and Arch.
                                </p>
                            </div>

                            <button disabled className="w-full h-12 bg-slate-800 text-slate-500 font-medium rounded-xl cursor-not-allowed border border-slate-700/50">
                                Linux Build Coming Soon
                            </button>
                        </div>

                    </div>
                </section>

                {/* Requirements & Hardware Section */}
                <section className="py-16 px-6 max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        
                        {/* Minimum Requirements */}
                        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl space-y-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Cpu className="text-cyan-400" size={20} />
                                Minimum System Requirements
                            </h3>
                            <ul className="space-y-3 text-slate-300 text-sm">
                                <li className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                                    <span className="text-slate-400">Operating System</span>
                                    <span className="font-semibold text-white">Windows 10 / 11 (64-bit)</span>
                                </li>
                                <li className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                                    <span className="text-slate-400">Architecture</span>
                                    <span className="font-semibold text-white">x64 Processor</span>
                                </li>
                                <li className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                                    <span className="text-slate-400">RAM</span>
                                    <span className="font-semibold text-white">4 GB RAM</span>
                                </li>
                                <li className="flex items-center justify-between">
                                    <span className="text-slate-400">Network</span>
                                    <span className="font-semibold text-white">Broadband Internet Connection</span>
                                </li>
                            </ul>
                        </div>

                        {/* Recommended Hardware */}
                        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl space-y-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <HardDrive className="text-cyan-400" size={20} />
                                Recommended Hardware
                            </h3>
                            <ul className="space-y-3 text-slate-300 text-sm">
                                <li className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                                    <span className="text-slate-400">GPU Encoder</span>
                                    <span className="font-semibold text-white">NVIDIA NVENC / Intel QuickSync</span>
                                </li>
                                <li className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                                    <span className="text-slate-400">Display Resolution</span>
                                    <span className="font-semibold text-white">1920x1080 @ 60 FPS</span>
                                </li>
                                <li className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                                    <span className="text-slate-400">Network Latency</span>
                                    <span className="font-semibold text-white">&lt; 50ms Ping to Signaling Relay</span>
                                </li>
                                <li className="flex items-center justify-between">
                                    <span className="text-slate-400">Bandwidth</span>
                                    <span className="font-semibold text-white">10+ Mbps Upload Speed</span>
                                </li>
                            </ul>
                        </div>

                    </div>
                </section>

                {/* FAQ Section */}
                <section className="py-16 px-6 max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-white text-center mb-10">
                        Download & Installation FAQ
                    </h2>
                    <Accordion items={FAQS_DATA.slice(0, 5)} />
                </section>
            </div>

            <Footer />
        </div>
    );
}
