import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Zap, Lock, MonitorPlay, ChevronRight, Settings, MousePointer2, MonitorDown, Loader2, MonitorSmartphone, Apple, User } from 'lucide-react';
import Navbar from './common/Navbar';
import Footer from './common/Footer';
import SEOHead from './common/SEOHead';

export default function Home() {
    const [scrolled, setScrolled] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem('chameleon_user');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleConnectClick = (e) => {
        e.preventDefault();
        setIsConnecting(true);
        setTimeout(() => {
            navigate('/connect');
        }, 600); // 600ms fake loading for perceived trust/speed
    };
    return (
        <div className="min-h-screen bg-[#0B0F1A] text-[#E5E7EB] font-sans selection:bg-[#06B6D4]/30 selection:text-cyan-200">
            <SEOHead 
                title="Secure Remote Access - Zero Setup" 
                description="Connect to your desktop from anywhere using encrypted, QR-based pairing. Ultra-low latency remote control with no IP setup required."
                canonical="https://chameleon-jet.vercel.app"
            />
            <Navbar />

            {/* Background Animated Grid & Glow - Matches App.jsx vibe */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#06B6D4]/5 blur-[120px] rounded-full"></div>
            </div>

            <div className="relative z-10">
                <section className="pt-40 pb-20 px-6 min-h-[90vh] flex flex-col items-center justify-center text-center">
                    <div className="inline-flex items-center gap-2 text-[#06B6D4] text-xs md:text-sm font-mono font-semibold uppercase tracking-widest mb-6">
                        <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></span>
                        Version 1.5.0 Live
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl leading-tight">
                        Secure Remote Access. <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22C55E] via-[#06B6D4] to-[#8B5CF6]">No IPs. No Complexity.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-[#9CA3AF] mb-10 max-w-3xl mx-auto leading-relaxed">
                        Connect to your desktop from anywhere using encrypted, QR-based pairing. No IP addresses. No complex setup. Just drop-in control.
                    </p>
                    <div className="flex flex-col items-center">
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-6">
                            <button onClick={handleConnectClick} disabled={isConnecting} className={`group h-12 px-8 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#06B6D4] hover:opacity-95 text-white font-semibold flex items-center justify-center gap-2 transition-all ${isConnecting ? 'opacity-80 cursor-wait shadow-[0_0_40px_rgba(6,182,212,0.4)]' : 'shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] active:scale-98'}`}>
                                {isConnecting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        Connect to Remote Client
                                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                            <a href="#download" className="h-12 px-8 rounded-xl bg-transparent hover:bg-[#0B0F1A] border border-[#1F2937] text-[#E5E7EB] font-semibold flex items-center justify-center gap-2 transition-all">
                                Download Desktop App
                            </a>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[#9CA3AF] font-medium tracking-wide">
                            <span>End-to-End Encrypted</span>
                            <span className="w-1 h-1 rounded-full bg-[#1F2937]"></span>
                            <span>Peer-to-Peer</span>
                            <span className="w-1 h-1 rounded-full bg-[#1F2937]"></span>
                            <span>No Data Stored</span>
                        </div>
                    </div>
                </section>

                {/* SECTION 2: How It Works */}
                <section className="py-24 px-6 border-t border-[#1F2937] bg-[#111827]/20">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold mb-4 text-[#E5E7EB]">How It Works</h2>
                            <p className="text-[#9CA3AF]">Three steps to full system control.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {[
                                { step: '01', title: 'Download Desktop Agent', desc: 'Install the lightweight host on your Windows or macOS machine.', icon: MonitorDown, colorClass: 'text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/20' },
                                { step: '02', title: 'Scan QR Code', desc: 'Open the Chameleon web client on any device and scan the secure code.', icon: Zap, colorClass: 'text-[#06B6D4] bg-[#06B6D4]/10 border-[#06B6D4]/20' },
                                { step: '03', title: 'Control Instantly', desc: 'An encrypted P2P connection establishes in seconds. View and control everything.', icon: MousePointer2, colorClass: 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20' },
                            ].map((item, i) => (
                                <div key={i} className="bg-[#111827] border border-[#1F2937] p-8 rounded-2xl backdrop-blur-sm hover:border-[#06B6D4]/30 transition-colors group">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${item.colorClass}`}>
                                            <item.icon size={24} />
                                        </div>
                                        <span className="text-4xl font-black text-[#E5E7EB]/5">{item.step}</span>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2 text-[#E5E7EB]">{item.title}</h3>
                                    <p className="text-[#9CA3AF] text-sm leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SECTION 3: Features */}
                <section className="py-24 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold mb-4 text-[#E5E7EB]">Enterprise-Grade Architecture</h2>
                            <p className="text-[#9CA3AF]">Built for uncompromising speed and security.</p>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { title: 'QR Instant Pairing', desc: 'No accounts, no passwords. Just scan and connect via ephemeral tokens.' },
                                { title: 'E2E Encryption', desc: 'All video, audio, and input data is secured by DTLS/SRTP WebRTC protocols.' },
                                { title: 'Ultra-Low Latency', desc: 'Direct Peer-to-Peer UDP streaming bypasses central servers entirely.' },
                                { title: 'Clipboard Sync', desc: 'Natively push and pull clipboard text between host and client over DataChannels.' },
                                { title: 'Adaptive Bitrate', desc: 'Auto-scaling resolution and bandwidth adaptation during network spikes.' },
                                { title: 'Hardware Encoding', desc: 'Utilizes NVENC/QuickSync on the host for near-zero overhead capture.' },
                                { title: 'Input Throttling', desc: 'Mathematical 60Hz input limits prevent network flooding on high-polling mice.' },
                                { title: 'Cross-Platform', desc: 'Control Windows and macOS hosts from iOS, Android, Linux, or ChromeOS.' }
                            ].map((feat, i) => (
                                <div key={i} className="p-6 rounded-2xl border border-[#1F2937] bg-[#111827]/40">
                                    <h4 className="text-[#06B6D4] font-medium text-sm mb-2">{feat.title}</h4>
                                    <p className="text-[#9CA3AF] text-sm leading-relaxed">{feat.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SECTION 4: Performance Focus */}
                <section className="py-24 px-6 bg-[#111827]/20 border-y border-[#1F2937]">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl font-bold mb-6 text-[#E5E7EB]">Built for Speed.</h2>
                        <p className="text-lg text-[#9CA3AF] mb-8 leading-relaxed">
                            When it comes to remote control, latency is the only metric that matters. Chameleon leverages hardware-accelerated H.264 encoding, strict 16ms mathematical input throttling, and `contentHint` optimization flags to guarantee a stable 60 FPS stream.
                        </p>
                        <div className="flex justify-center gap-8 text-center text-sm font-mono text-[#06B6D4]">
                            <div>
                                <div className="text-3xl font-bold text-[#E5E7EB] mb-1">~12ms</div>
                                <span>Input Latency</span>
                            </div>
                            <div className="w-[1px] bg-[#1F2937]"></div>
                            <div>
                                <div className="text-3xl font-bold text-[#E5E7EB] mb-1">60</div>
                                <span>FPS Locked</span>
                            </div>
                            <div className="w-[1px] bg-[#1F2937]"></div>
                            <div>
                                <div className="text-3xl font-bold text-[#E5E7EB] mb-1">0</div>
                                <span>Cloud Relays</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 5: Downloads */}
                <section id="download" className="py-24 px-6 scroll-mt-16">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold mb-4 text-[#E5E7EB]">Download Chameleon Desktop Agent</h2>
                            <p className="text-[#9CA3AF]">The lightweight host application required to share your screen.</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Windows Card */}
                            <div className="bg-[#111827] border border-[#1F2937] p-8 rounded-2xl flex flex-col items-center text-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-[#3B82F6]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="w-16 h-16 rounded-xl bg-[#0B0F1A] flex items-center justify-center mb-6 border border-[#1F2937]">
                                    <MonitorPlay size={32} className="text-[#3B82F6]" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2 text-[#E5E7EB]">Windows</h3>
                                <p className="text-[#9CA3AF] text-sm mb-8">Windows 10 / 11 (x64)</p>
                                <a href="/Network-Provider-Access-Setup-1.4.1.exe" download className="w-full py-4 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#06B6D4] hover:opacity-95 text-white font-bold transition-all z-10 relative shadow-[0_0_20px_rgba(6,182,212,0.2)] active:scale-98">
                                    <div className="flex items-center justify-center gap-3">
                                        <MonitorSmartphone className="w-5 h-5" />
                                        Download for Windows
                                    </div>
                                </a>
                                <span className="text-xs text-[#9CA3AF]/60 mt-4 font-mono">v1.4.1 • ~77 MB</span>
                                <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-[#22C55E] uppercase tracking-widest font-bold">
                                    <ShieldCheck size={12} /> Verified & Secure
                                </div>
                                <a href="/Chameleon-Agent-Setup-Legacy.exe" download className="mt-4 text-[10px] text-[#9CA3AF] hover:text-[#06B6D4] underline transition-colors relative z-10">
                                    Experiencing issues connecting on 1.0.7? Download Legacy v1.0.4
                                </a>
                            </div>

                            {/* macOS Card */}
                            <div className="bg-[#111827] border border-[#1F2937] p-8 rounded-2xl flex flex-col items-center text-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-[#8B5CF6]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="w-16 h-16 rounded-xl bg-[#0B0F1A] flex items-center justify-center mb-6 border border-[#1F2937]">
                                    <MonitorPlay size={32} className="text-[#9CA3AF]" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2 text-[#E5E7EB]">macOS</h3>
                                <p className="text-[#9CA3AF] text-sm mb-8">Intel & Apple Silicon (Universal)</p>
                                <div className="w-full py-4 rounded-xl bg-[#0B0F1A] border border-[#1F2937] text-[#9CA3AF]/60 font-semibold cursor-not-allowed z-10 relative opacity-60">
                                    <div className="flex items-center justify-center gap-3">
                                        <Apple className="w-5 h-5" />
                                        Coming Soon
                                    </div>
                                </div>
                                <span className="text-xs text-[#9CA3AF]/40 mt-4 font-mono">macOS support launching soon</span>
                                <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-[#9CA3AF]/40 uppercase tracking-widest font-bold">
                                    In Development
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
            <Footer />
        </div>
    );
}
