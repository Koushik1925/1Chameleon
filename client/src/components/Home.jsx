import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Zap, Lock, MonitorPlay, ChevronRight, Settings, MousePointer2, MonitorDown, Loader2, MonitorSmartphone, Apple, User, Sparkles, Cpu, Shield, Globe } from 'lucide-react';
import Navbar from './common/Navbar';
import Footer from './common/Footer';
import SEOHead from './common/SEOHead';
import Auralis from './ui/auralis';

export default function Home() {
    const [scrolled, setScrolled] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [user] = useState(() => {
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
        }, 600);
    };

    // Chameleon Brand Colors for WebGL Ambient Reflection
    const brandColors = ["#22C55E", "#06B6D4", "#8B5CF6"];

    return (
        <div className="min-h-screen bg-[#090D17] text-[#9CA3AF] font-sans selection:bg-[#06B6D4]/30 selection:text-cyan-200">
            <SEOHead 
                title="Secure Remote Access - Zero Setup" 
                description="Connect to your desktop from anywhere using encrypted, QR-based pairing. Ultra-low latency remote control with no IP setup required."
                canonical="https://www.chameleon-agent.online"
            />
            <Navbar />

            {/* Full-screen Fixed WebGL Ambient Background Auralis */}
            <div className="fixed inset-0 pointer-events-none -z-10 w-full h-full">
                <Auralis
                    colors={brandColors}
                    speed={0.35}
                    grain={0.45}
                    className="w-full h-full"
                />
                <div className="absolute inset-0 bg-grid-pattern opacity-70"></div>
            </div>

            <div className="relative z-10">
                {/* SECTION 1: Apple Liquid Glass Hero Section */}
                <section className="pt-44 pb-24 px-6 min-h-[92vh] flex flex-col justify-center items-center">
                    {/* Floating Version Badge */}
                    <div className="inline-flex items-center gap-2 text-[#06B6D4] text-[10px] sm:text-xs font-mono font-semibold uppercase tracking-[0.12em] mb-4 liquid-glass-badge px-3.5 py-1.2 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse"></span>
                        Version 1.5.0 Live
                    </div>
                    
                    <div className="max-w-[900px] mx-auto space-y-7 text-center">
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[#F3F4F6] leading-[1.1]">
                            Secure Remote Access. <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22C55E] via-[#06B6D4] to-[#8B5CF6]">
                                No IPs. No Complexity.
                            </span>
                        </h1>
                        <p className="text-base sm:text-lg md:text-xl text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
                            Connect to your desktop from anywhere using encrypted, QR-based pairing. No IP addresses. No complex setup. Just drop-in control.
                        </p>
                    </div>

                    {/* Apple Liquid Glass CTA Buttons */}
                    <div className="flex flex-col items-center mt-10">
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-8">
                            <button 
                                onClick={handleConnectClick} 
                                disabled={isConnecting} 
                                className="group h-12 px-8 rounded-2xl liquid-glass-btn-primary text-white font-bold flex items-center justify-center gap-2 text-sm disabled:opacity-50"
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
                            <a 
                                href="#download" 
                                className="h-12 px-8 rounded-2xl liquid-glass-btn-secondary text-[#F3F4F6] font-semibold text-sm flex items-center justify-center gap-2"
                            >
                                Download Desktop App
                            </a>
                        </div>

                        {/* Floating Security Capsule */}
                        <div className="flex items-center gap-3 text-[10px] text-[#9CA3AF]/90 font-mono uppercase tracking-[0.15em] liquid-glass-badge px-4 py-1.5 rounded-full">
                            <span className="flex items-center gap-1"><Lock size={12} className="text-emerald-400" /> End-to-End Encrypted</span>
                            <span className="w-1 h-1 rounded-full bg-white/30"></span>
                            <span>Peer-to-Peer</span>
                            <span className="w-1 h-1 rounded-full bg-white/30"></span>
                            <span>Zero Data Stored</span>
                        </div>
                    </div>
                </section>

                {/* SECTION 2: How It Works - Apple Floating Glass Panes */}
                <section className="py-28 px-6 border-t border-white/6 bg-[#090D17]/40">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-20">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium text-cyan-400 liquid-glass-badge mb-3">
                                <Sparkles size={13} />
                                <span>Seamless Workflow</span>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-[#F3F4F6] tracking-tight">How It Works</h2>
                            <p className="text-[#9CA3AF] text-sm md:text-base max-w-xl mx-auto">Three steps to instant, high-performance system control.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                { step: '01', title: 'Download Desktop Agent', desc: 'Install the lightweight host application on your Windows machine.', icon: MonitorDown, colorClass: 'text-[#3B82F6] bg-[#3B82F6]/10 border-white/10' },
                                { step: '02', title: 'Scan QR Code', desc: 'Open the Chameleon web client on any device and scan the secure pairing code.', icon: Zap, colorClass: 'text-[#06B6D4] bg-[#06B6D4]/10 border-white/10' },
                                { step: '03', title: 'Control Instantly', desc: 'An encrypted P2P WebRTC connection establishes in milliseconds. View and control everything.', icon: MousePointer2, colorClass: 'text-[#22C55E] bg-[#22C55E]/10 border-white/10' },
                            ].map((item, i) => (
                                <div key={i} className="liquid-glass-card p-8 rounded-3xl relative overflow-hidden group">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${item.colorClass} backdrop-blur-md`}>
                                            <item.icon size={22} />
                                        </div>
                                        <span className="text-4xl font-black text-white/5 font-mono group-hover:text-white/10 transition-colors">{item.step}</span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 text-[#F3F4F6]">{item.title}</h3>
                                    <p className="text-[#9CA3AF] text-sm leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SECTION 3: Enterprise Architecture - Apple Glass Cards */}
                <section className="py-28 px-6 border-t border-white/6 bg-[#090D17]/80">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-20 space-y-3">
                            <h2 className="text-3xl md:text-5xl font-bold text-[#F3F4F6] tracking-tight">Enterprise-Grade Architecture</h2>
                            <p className="text-[#9CA3AF] text-sm md:text-base max-w-2xl mx-auto">Engineered for low-latency performance and hardware security.</p>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { title: 'QR Instant Pairing', desc: 'No accounts, no passwords. Connect instantly via ephemeral cryptographic tokens.' },
                                { title: 'E2E Encryption', desc: 'All video streams and input events are secured using WebRTC DTLS/SRTP over UDP.' },
                                { title: 'Ultra-Low Latency', desc: 'Direct Peer-to-Peer UDP streaming bypasses central server bottlenecks.' },
                                { title: 'Clipboard Sync', desc: 'Natively sync clipboard content between host and client over WebRTC DataChannels.' },
                                { title: 'Adaptive Bitrate', desc: 'Real-time resolution and frame-rate scaling during network bandwidth fluctuations.' },
                                { title: 'Hardware Encoding', desc: 'GPU NVENC & QuickSync pipeline ensures near-zero CPU overhead on host.' },
                                { title: 'Input Throttling', desc: 'Mathematical 60Hz input sampling prevents packet congestion during intense mouse movements.' },
                                { title: 'Cross-Platform', desc: 'Control Windows machines from macOS, Linux, ChromeOS, iOS, or Android browser.' }
                            ].map((feat, i) => (
                                <div key={i} className="liquid-glass-card p-6 rounded-3xl">
                                    <h4 className="text-[#06B6D4] font-bold text-xs mb-2.5 uppercase tracking-[0.12em]">{feat.title}</h4>
                                    <p className="text-[#9CA3AF] text-xs leading-relaxed">{feat.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SECTION 4: Performance Focus - Liquid Glass Hero Display */}
                <section className="py-24 px-6 border-y border-white/6 max-w-6xl mx-auto my-16 rounded-[40px] liquid-glass-hero">
                    <div className="max-w-4xl mx-auto text-center space-y-8">
                        <h2 className="text-3xl md:text-5xl font-bold text-[#F3F4F6] tracking-tight">Built for Speed.</h2>
                        <p className="text-base sm:text-lg text-[#9CA3AF] leading-relaxed max-w-3xl mx-auto">
                            In remote desktop software, latency is everything. Chameleon combines hardware DXGI desktop capture, NVENC acceleration, and 16ms input loop throttling to guarantee liquid-smooth 60 FPS remote sessions.
                        </p>

                        <div className="grid grid-cols-3 gap-6 text-center pt-4 max-w-2xl mx-auto">
                            <div className="liquid-glass-card p-5 rounded-2xl">
                                <div className="text-3xl md:text-4xl font-extrabold text-[#F3F4F6] mb-1 font-mono">~12ms</div>
                                <span className="text-[11px] font-mono tracking-wider uppercase text-cyan-400">Input Latency</span>
                            </div>
                            <div className="liquid-glass-card p-5 rounded-2xl">
                                <div className="text-3xl md:text-4xl font-extrabold text-[#F3F4F6] mb-1 font-mono">60</div>
                                <span className="text-[11px] font-mono tracking-wider uppercase text-emerald-400">FPS Locked</span>
                            </div>
                            <div className="liquid-glass-card p-5 rounded-2xl">
                                <div className="text-3xl md:text-4xl font-extrabold text-[#F3F4F6] mb-1 font-mono">0</div>
                                <span className="text-[11px] font-mono tracking-wider uppercase text-purple-400">Cloud Relays</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 5: Downloads - Floating Apple Glass Panes */}
                <section id="download" className="py-28 px-6 scroll-mt-20">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-[#F3F4F6] tracking-tight">Download Chameleon Host Agent</h2>
                            <p className="text-[#9CA3AF] text-sm md:text-base">The host application required to share your desktop screen.</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Windows Card */}
                            <div className="liquid-glass-card p-8 rounded-3xl flex flex-col items-center text-center relative overflow-hidden group">
                                <div className="w-16 h-16 rounded-2xl liquid-glass-badge flex items-center justify-center mb-6">
                                    <MonitorPlay size={32} className="text-[#3B82F6]" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2 text-[#F3F4F6]">Windows Host</h3>
                                <p className="text-[#9CA3AF] text-sm mb-8">Windows 10 / 11 (64-bit)</p>
                                
                                <a 
                                    href="/Network-Provider-Access-Setup-1.4.1.exe" 
                                    download 
                                    className="w-full py-3.5 rounded-2xl liquid-glass-btn-primary text-white font-bold transition-all z-10 relative"
                                >
                                    <div className="flex items-center justify-center gap-2.5 text-sm">
                                        <MonitorSmartphone className="w-4 h-4" />
                                        Download for Windows
                                    </div>
                                </a>

                                <span className="text-xs text-[#9CA3AF]/70 mt-4 font-mono">v1.4.1 • ~77 MB</span>
                                <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-emerald-400 uppercase tracking-[0.15em] font-bold">
                                    <ShieldCheck size={13} /> Verified & Signed
                                </div>
                            </div>

                            {/* macOS Card */}
                            <div className="liquid-glass-card p-8 rounded-3xl flex flex-col items-center text-center relative opacity-80">
                                <div className="w-16 h-16 rounded-2xl liquid-glass-badge flex items-center justify-center mb-6">
                                    <Apple size={32} className="text-[#9CA3AF]" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2 text-[#F3F4F6]">macOS Host</h3>
                                <p className="text-[#9CA3AF] text-sm mb-8">Apple Silicon & Intel Universal</p>
                                
                                <div className="w-full py-3.5 rounded-2xl liquid-glass-btn-secondary text-[#9CA3AF]/60 font-semibold cursor-not-allowed z-10 relative">
                                    <div className="flex items-center justify-center gap-2 text-sm">
                                        <Apple className="w-4 h-4" />
                                        Coming Soon
                                    </div>
                                </div>

                                <span className="text-xs text-[#9CA3AF]/50 mt-4 font-mono">macOS host build in testing</span>
                                <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-[#9CA3AF]/50 uppercase tracking-[0.15em] font-bold">
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
