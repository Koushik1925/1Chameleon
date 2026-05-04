import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Zap, Lock, MonitorPlay, ChevronRight, Settings, MousePointer2, MonitorDown, Loader2, MonitorSmartphone, Apple } from 'lucide-react';

export default function Home() {
    const [scrolled, setScrolled] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
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
        <div className="min-h-screen bg-[#0b0f14] text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200">

            {/* Background Animated Grid & Glow - Matches App.jsx vibe */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-900/10 blur-[120px] rounded-full"></div>
            </div>

            <div className="relative z-10">

                {/* Navigation Bar */}
                <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#0b0f14]/80 backdrop-blur-md border-b border-white/5 py-0' : 'bg-transparent border-transparent py-2'}`}>
                    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Settings className="text-cyan-400" size={24} />
                            <span className="font-bold text-xl tracking-wide">Service Host : Network Provider Access</span>
                        </div>
                        <div className="flex gap-4">
                            <a href="#download" className="text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center h-9 px-4 rounded-lg hover:bg-white/5">
                                Download Agent
                            </a>
                            <Link to="/connect" className="text-sm font-medium text-black bg-cyan-400 hover:bg-cyan-300 transition-colors flex items-center h-9 px-4 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                                Connect
                            </Link>
                        </div>
                    </div>
                </nav>

                {/* SECTION 1: Hero */}
                <section className="pt-40 pb-20 px-6 min-h-[90vh] flex flex-col items-center justify-center text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-8 animate-pulse-slow">
                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                        Version 1.3.2 Live
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl leading-tight">
                        Secure Remote Access. <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">No IPs. No Complexity.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed">
                        Connect to your desktop from anywhere using encrypted, QR-based pairing. No IP addresses. No complex setup. Just drop-in control.
                    </p>
                    <div className="flex flex-col items-center">
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-6">
                            <button onClick={handleConnectClick} disabled={isConnecting} className={`group h-12 px-8 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold flex items-center justify-center gap-2 transition-all ${isConnecting ? 'opacity-80 cursor-wait shadow-[0_0_40px_rgba(6,182,212,0.5)]' : 'shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)]'}`}>
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
                            <a href="#download" className="h-12 px-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium flex items-center justify-center gap-2 transition-all">
                                Download Desktop App
                            </a>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium tracking-wide">
                            <span>End-to-End Encrypted</span>
                            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                            <span>Peer-to-Peer</span>
                            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                            <span>No Data Stored</span>
                        </div>
                    </div>
                </section>

                {/* SECTION 2: How It Works */}
                <section className="py-24 px-6 border-t border-white/5 bg-black/30">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
                            <p className="text-slate-400">Three steps to full system control.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {[
                                { step: '01', title: 'Download Desktop Agent', desc: 'Install the lightweight host on your Windows or macOS machine.', icon: MonitorDown },
                                { step: '02', title: 'Scan QR Code', desc: 'Open the Chameleon web client on any device and scan the secure code.', icon: Zap },
                                { step: '03', title: 'Control Instantly', desc: 'An encrypted P2P connection establishes in seconds. View and control everything.', icon: MousePointer2 },
                            ].map((item, i) => (
                                <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-sm hover:border-cyan-500/30 transition-colors group">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                                            <item.icon size={24} />
                                        </div>
                                        <span className="text-4xl font-black text-white/5">{item.step}</span>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SECTION 3: Features */}
                <section className="py-24 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold mb-4">Enterprise-Grade Architecture</h2>
                            <p className="text-slate-400">Built for uncompromising speed and security.</p>
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
                                <div key={i} className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent">
                                    <h4 className="text-cyan-400 font-medium text-sm mb-2">{feat.title}</h4>
                                    <p className="text-slate-500 text-sm leading-relaxed">{feat.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SECTION 4: Performance Focus */}
                <section className="py-24 px-6 bg-gradient-to-b from-transparent to-cyan-950/20 border-b border-white/5">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl font-bold mb-6">Built for Speed.</h2>
                        <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                            When it comes to remote control, latency is the only metric that matters. Chameleon leverages hardware-accelerated H.264 encoding, strict 16ms mathematical input throttling, and `contentHint` optimization flags to guarantee a stable 60 FPS stream.
                        </p>
                        <div className="flex justify-center gap-8 text-center text-sm font-mono text-cyan-400">
                            <div>
                                <div className="text-3xl font-bold text-white mb-1">~12ms</div>
                                <span>Input Latency</span>
                            </div>
                            <div className="w-[1px] bg-white/10"></div>
                            <div>
                                <div className="text-3xl font-bold text-white mb-1">60</div>
                                <span>FPS Locked</span>
                            </div>
                            <div className="w-[1px] bg-white/10"></div>
                            <div>
                                <div className="text-3xl font-bold text-white mb-1">0</div>
                                <span>Cloud Relays</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 5: Downloads */}
                <section id="download" className="py-24 px-6 scroll-mt-16">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold mb-4">Download Chameleon Desktop Agent</h2>
                            <p className="text-slate-400">The lightweight host application required to share your screen.</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Windows Card */}
                            <div className="bg-[#111827] border border-slate-800 p-8 rounded-3xl flex flex-col items-center text-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                                    <MonitorPlay size={32} className="text-blue-400" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">Windows</h3>
                                <p className="text-slate-400 text-sm mb-8">Windows 10 / 11 (x64)</p>
                                <a href="/Network-Provider-Access-Setup-1.3.2.exe" download className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors z-10 relative">
                                    <div className="flex items-center justify-center gap-3">
                                        <MonitorSmartphone className="w-5 h-5" />
                                        Download for Windows
                                    </div>
                                </a>
                                <span className="text-xs text-slate-600 mt-4 font-mono">v1.3.2 • ~77 MB</span>
                                <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-green-500/70 uppercase tracking-widest font-bold">
                                    <ShieldCheck size={12} /> Verified & Secure
                                </div>
                                <a href="/Chameleon-Agent-Setup-Legacy.exe" download className="mt-4 text-[10px] text-slate-500 hover:text-cyan-400 underline transition-colors relative z-10">
                                    Experiencing issues connecting on 1.0.7? Download Legacy v1.0.4
                                </a>
                            </div>

                            {/* macOS Card */}
                            <div className="bg-[#111827] border border-slate-800 p-8 rounded-3xl flex flex-col items-center text-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-slate-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                                    <MonitorPlay size={32} className="text-slate-300" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">macOS</h3>
                                <p className="text-slate-400 text-sm mb-8">Intel & Apple Silicon (Universal)</p>
                                <a href="/Network-Provider-Access-macOS-1.3.2.dmg" download className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium transition-colors z-10 relative">
                                    <div className="flex items-center justify-center gap-3">
                                        <Apple className="w-5 h-5" />
                                        Download for macOS
                                    </div>
                                </a>
                                <span className="text-xs text-slate-600 mt-4 font-mono">v1.3.2 • ~95 MB</span>
                                <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-green-500/70 uppercase tracking-widest font-bold">
                                    <ShieldCheck size={12} /> Verified & Secure
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 6 & 7: Security & Footer */}
                <footer className="border-t border-white/5 bg-black pt-16 pb-8 px-6 text-center">
                    <div className="max-w-2xl mx-auto mb-16">
                        <Lock className="mx-auto text-cyan-500 hover:text-cyan-400 transition-colors mb-4 opacity-50" size={32} />
                        <h3 className="text-xl font-semibold mb-3">Your screen is yours.</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            All connections are end-to-end encrypted via WebRTC. No screen data, keystrokes, or clipboard contents are ever routed through our signaling servers. The connection is direct, private, and expires automatically.
                        </p>
                    </div>

                    <div className="max-w-7xl mx-auto border-t border-white/5 pt-12 mt-8 flex flex-col items-center justify-center text-xs text-slate-500 font-medium tracking-wide">
                        <div className="mb-2 text-slate-400">Service Host © {new Date().getFullYear()}</div>
                        <div>
                            Founder & Developer —{' '}
                            <a
                                href="https://github.com/Rithvik-krishna"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] transition-all duration-300"
                            >
                                Rithvik Krishna
                            </a>
                        </div>
                    </div>
                </footer>

            </div>
        </div>
    );
}
