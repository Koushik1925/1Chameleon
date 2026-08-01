import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Zap, Lock, MonitorPlay, ChevronRight, Settings, MousePointer2, MonitorDown, Loader2, MonitorSmartphone, Apple, User } from 'lucide-react';
import Navbar from './common/Navbar';
import Footer from './common/Footer';
import SEOHead from './common/SEOHead';
import Auralis from './ui/auralis';

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

    // Chameleon Brand Colors: Primary Green (#22C55E), Primary Teal (#06B6D4), Accent Purple (#8B5CF6)
    const brandColors = ["#22C55E", "#06B6D4", "#8B5CF6"];

    return (
        <div className="min-h-screen bg-[#090D17] text-[#9CA3AF] font-sans selection:bg-[#06B6D4]/30 selection:text-cyan-200">
            <SEOHead 
                title="Secure Remote Access - Zero Setup" 
                description="Connect to your desktop from anywhere using encrypted, QR-based pairing. Ultra-low latency remote control with no IP setup required."
                canonical="https://www.chameleon-agent.online"
            />
            <Navbar />

            {/* Background Animated Grid & Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-grid-pattern opacity-100"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-tr from-[#22C55E]/3 to-[#06B6D4]/3 blur-[140px] rounded-full"></div>
            </div>

            <div className="relative z-10">
                {/* SECTION 1: Hero with WebGL Auralis Background */}
                <Auralis
                    colors={brandColors}
                    speed={0.35}
                    grain={0.45}
                    height="auto"
                    className="pt-48 pb-24 px-6 min-h-[95vh] border-b border-white/5 shadow-2xl"
                >
                    <div className="inline-flex items-center gap-1.5 text-[#06B6D4] text-[10px] sm:text-xs font-mono font-semibold uppercase tracking-[0.12em] mb-3 bg-[#090D17]/80 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse"></span>
                        Version 1.5.0 Live
                    </div>
                    
                    <div className="max-w-[900px] mx-auto space-y-8 text-center">
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[#F3F4F6] leading-tight">
                            Secure Remote Access. <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22C55E] via-[#06B6D4] to-[#8B5CF6]">No IPs. No Complexity.</span>
                        </h1>
                        <p className="text-lg md:text-xl text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
                            Connect to your desktop from anywhere using encrypted, QR-based pairing. No IP addresses. No complex setup. Just drop-in control.
                        </p>
                    </div>

                    <div className="flex flex-col items-center mt-12">
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-8">
                            <button 
                                onClick={handleConnectClick} 
                                disabled={isConnecting} 
                                className={`group h-12 px-8 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#06B6D4] text-white font-bold flex items-center justify-center gap-2 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(6,182,212,0.3)] active:scale-98 disabled:opacity-50`}
                            >
                                {isConnecting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        Connect to Remote Client
                                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform duration-150" />
                                    </>
                                )}
                            </button>
                            <a href="#download" className="h-12 px-8 rounded-xl bg-slate-900/80 hover:bg-white/10 border border-white/10 text-[#F3F4F6] font-semibold flex items-center justify-center gap-2 transition-all duration-150 ease-out active:scale-98 backdrop-blur-md">
                                Download Desktop App
                            </a>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-[#9CA3AF]/80 font-mono uppercase tracking-[0.15em] bg-[#090D17]/60 px-4 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
                            <span>End-to-End Encrypted</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                            <span>Peer-to-Peer</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                            <span>No Data Stored</span>
                        </div>
                    </div>
                </Auralis>

                {/* SECTION 2: How It Works - Alternating Background (#0D1320) */}
                <section className="py-28 px-6 border-t border-white/5 bg-[#0D1320]">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-20">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#F3F4F6] tracking-tight">How It Works</h2>
                            <p className="text-[#9CA3AF] text-sm md:text-base">Three steps to full system control.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                { step: '01', title: 'Download Desktop Agent', desc: 'Install the lightweight host on your Windows or macOS machine.', icon: MonitorDown, colorClass: 'text-[#3B82F6] bg-[#3B82F6]/10 border-white/5' },
                                { step: '02', title: 'Scan QR Code', desc: 'Open the Chameleon web client on any device and scan the secure code.', icon: Zap, colorClass: 'text-[#06B6D4] bg-[#06B6D4]/10 border-white/5' },
                                { step: '03', title: 'Control Instantly', desc: 'An encrypted P2P connection establishes in seconds. View and control everything.', icon: MousePointer2, colorClass: 'text-[#22C55E] bg-[#22C55E]/10 border-white/5' },
                            ].map((item, i) => (
                                <div key={i} className="bg-[#111827]/72 border border-white/6 p-8 rounded-[18px] backdrop-blur-[12px] hover:-translate-y-1.5 hover:border-[#06B6D4]/35 hover:shadow-[0_15px_40px_rgba(0,0,0,0.45)] transition-all duration-150 ease-out group">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${item.colorClass}`}>
                                            <item.icon size={24} />
                                        </div>
                                        <span className="text-4xl font-black text-[#F3F4F6]/5 font-mono">{item.step}</span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 text-[#F3F4F6]">{item.title}</h3>
                                    <p className="text-[#9CA3AF] text-sm leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SECTION 3: Features - Alternating Background (#090D17) */}
                <section className="py-28 px-6 bg-[#090D17] border-t border-white/5">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-20">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#F3F4F6] tracking-tight">Enterprise-Grade Architecture</h2>
                            <p className="text-[#9CA3AF] text-sm md:text-base">Built for uncompromising speed and security.</p>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                                <div key={i} className="p-6 rounded-[18px] border border-white/6 bg-[#111827]/72 backdrop-blur-[12px] hover:-translate-y-1 hover:border-[#06B6D4]/35 transition-all duration-150 ease-out">
                                    <h4 className="text-[#06B6D4] font-bold text-sm mb-3 uppercase tracking-[0.1em]">{feat.title}</h4>
                                    <p className="text-[#9CA3AF] text-sm leading-relaxed">{feat.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SECTION 4: Performance Focus - Alternating Background (#0D1320) */}
                <section className="py-28 px-6 bg-[#0D1320] border-y border-white/5">
                    <div className="max-w-4xl mx-auto text-center space-y-8">
                        <h2 className="text-3xl md:text-4xl font-bold text-[#F3F4F6] tracking-tight">Built for Speed.</h2>
                        <p className="text-lg text-[#9CA3AF] leading-relaxed max-w-3xl mx-auto">
                            When it comes to remote control, latency is the only metric that matters. Chameleon leverages hardware-accelerated H.264 encoding, strict 16ms mathematical input throttling, and `contentHint` optimization flags to guarantee a stable 60 FPS stream.
                        </p>
                        <div className="flex justify-center gap-10 text-center text-xs font-mono tracking-wider uppercase text-[#06B6D4] pt-4">
                            <div>
                                <div className="text-3xl md:text-4xl font-bold text-[#F3F4F6] mb-2">~12ms</div>
                                <span>Input Latency</span>
                            </div>
                            <div className="w-[1px] bg-white/5"></div>
                            <div>
                                <div className="text-3xl md:text-4xl font-bold text-[#F3F4F6] mb-2">60</div>
                                <span>FPS Locked</span>
                            </div>
                            <div className="w-[1px] bg-white/5"></div>
                            <div>
                                <div className="text-3xl md:text-4xl font-bold text-[#F3F4F6] mb-2">0</div>
                                <span>Cloud Relays</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 5: Downloads - Alternating Background (#090D17) */}
                <section id="download" className="py-28 px-6 bg-[#090D17] scroll-mt-20">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-20">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#F3F4F6] tracking-tight">Download Chameleon Desktop Agent</h2>
                            <p className="text-[#9CA3AF] text-sm md:text-base">The lightweight host application required to share your screen.</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Windows Card */}
                            <div className="bg-[#111827]/72 border border-white/6 p-8 rounded-[18px] backdrop-blur-[12px] flex flex-col items-center text-center relative overflow-hidden transition-all duration-150 ease-out hover:-translate-y-1.5 hover:border-[#06B6D4]/35 hover:shadow-[0_15px_40px_rgba(0,0,0,0.45)] group">
                                <div className="absolute inset-0 bg-[#3B82F6]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"></div>
                                <div className="w-16 h-16 rounded-xl bg-[#090D17] flex items-center justify-center mb-6 border border-white/5">
                                    <MonitorPlay size={32} className="text-[#3B82F6]" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2 text-[#F3F4F6]">Windows</h3>
                                <p className="text-[#9CA3AF] text-sm mb-8">Windows 10 / 11 (x64)</p>
                                <a href="/Network-Provider-Access-Setup-1.4.1.exe" download className="w-full py-4 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#06B6D4] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(6,182,212,0.3)] text-white font-bold transition-all duration-150 ease-out z-10 relative active:scale-98">
                                    <div className="flex items-center justify-center gap-3">
                                        <MonitorSmartphone className="w-5 h-5" />
                                        Download for Windows
                                    </div>
                                </a>
                                <span className="text-xs text-[#9CA3AF]/60 mt-4 font-mono">v1.4.1 • ~77 MB</span>
                                <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-[#22C55E] uppercase tracking-[0.15em] font-bold">
                                    <ShieldCheck size={12} /> Verified & Secure
                                </div>
                                <a href="/Chameleon-Agent-Setup-Legacy.exe" download className="mt-4 text-[10px] text-[#9CA3AF] hover:text-[#06B6D4] underline transition-colors duration-150 relative z-10">
                                    Experiencing issues connecting on 1.0.7? Download Legacy v1.0.4
                                </a>
                            </div>

                            {/* macOS Card */}
                            <div className="bg-[#111827]/72 border border-white/6 p-8 rounded-[18px] backdrop-blur-[12px] flex flex-col items-center text-center relative overflow-hidden transition-all duration-150 ease-out hover:-translate-y-1.5 hover:border-[#06B6D4]/35 hover:shadow-[0_15px_40px_rgba(0,0,0,0.45)] group">
                                <div className="absolute inset-0 bg-[#8B5CF6]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"></div>
                                <div className="w-16 h-16 rounded-xl bg-[#090D17] flex items-center justify-center mb-6 border border-white/5">
                                    <MonitorPlay size={32} className="text-[#9CA3AF]" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2 text-[#F3F4F6]">macOS</h3>
                                <p className="text-[#9CA3AF] text-sm mb-8">Intel & Apple Silicon (Universal)</p>
                                <div className="w-full py-4 rounded-xl bg-[#090D17] border border-white/5 text-[#9CA3AF]/40 font-semibold cursor-not-allowed z-10 relative opacity-60">
                                    <div className="flex items-center justify-center gap-3">
                                        <Apple className="w-5 h-5" />
                                        Coming Soon
                                    </div>
                                </div>
                                <span className="text-xs text-[#9CA3AF]/40 mt-4 font-mono">macOS support launching soon</span>
                                <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-[#9CA3AF]/40 uppercase tracking-[0.15em] font-bold">
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
