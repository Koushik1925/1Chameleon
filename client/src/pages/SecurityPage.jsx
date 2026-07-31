import SEOHead from '../components/common/SEOHead';
import PageHero from '../components/common/PageHero';
import Accordion from '../components/common/Accordion';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { Lock, ShieldCheck, Key, Server, Cpu, AlertTriangle, EyeOff } from 'lucide-react';

export default function SecurityPage() {
    const securityFaqs = [
        {
            question: 'Can Chameleon operators or servers view my remote desktop screen?',
            answer: 'No. Chameleon uses end-to-end DTLS-SRTP WebRTC encryption. Video frames and remote inputs are encrypted on the host before sending and decrypted directly in your client browser. Relay servers cannot inspect stream payloads.'
        },
        {
            question: 'What encryption ciphers are utilized?',
            answer: 'Media channels use AES-GCM 256-bit ciphers via SRTP. WebSockets signaling handshake traffic is protected using TLS 1.3 encryption.'
        },
        {
            question: 'How are permanent device pairing keys generated?',
            answer: 'Permanent pair codes (e.g. 6-digit keys) are mathematically derived from cryptographically hashed hardware specs (hostname, architecture, platform ID) combined with unique session entropy.'
        }
    ];

    return (
        <div className="min-h-screen bg-[#0b0f14] text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
            <SEOHead 
                title="Security Architecture & Encryption" 
                description="Explore Chameleon's end-to-end DTLS-SRTP encryption, WebRTC security standards, device identity verification, and vulnerability disclosure policies."
                canonical="https://chameleon-jet.vercel.app/security"
            />
            <Navbar />

            <div className="relative z-10 pb-20">
                <PageHero 
                    badge="Zero-Trust Architecture"
                    title="Security"
                    titleGradient="First."
                    subtitle="Chameleon is engineered from the ground up to guarantee that your remote desktop connections remain completely private, end-to-end encrypted, and uninspectable."
                />

                {/* Core Pillars Grid */}
                <section className="px-6 max-w-7xl mx-auto mb-20">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        
                        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6">
                                <Lock size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">End-to-End Encryption</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                All media streams and remote control inputs are encrypted using WebRTC DTLS 1.2 and SRTP with AES-GCM 256-bit keys negotiated directly between peers.
                            </p>
                        </div>

                        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6">
                                <Server size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">TLS 1.3 Signaling</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Signaling exchanges (SDP offers, answers, and ICE candidate discovery) take place over secure WebSockets TLS 1.3 channels.
                            </p>
                        </div>

                        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6">
                                <Key size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">Cryptographic Device Identity</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Host hardware IDs are derived using system specs and signed JWT refresh tokens, preventing impersonation or unauthorized host claiming.
                            </p>
                        </div>

                    </div>
                </section>

                {/* Detailed Security Controls */}
                <section className="px-6 max-w-5xl mx-auto mb-20 space-y-8">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 md:p-12 backdrop-blur-xl space-y-6">
                        <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                            <ShieldCheck className="text-cyan-400" size={28} />
                            Multi-Layered Remote Access Controls
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-300">
                            <div>
                                <h4 className="font-bold text-white text-base mb-2">Session Approval Badges</h4>
                                <p className="leading-relaxed text-slate-400">
                                    When an incoming connection is requested, the Desktop Agent displays an explicit green approval banner. Remote control can be paused instantly using global hotkey <code className="text-cyan-400 font-mono bg-slate-950 px-2 py-0.5 rounded">Ctrl+Alt+P</code>.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-bold text-white text-base mb-2">Unattended Access Protection</h4>
                                <p className="leading-relaxed text-slate-400">
                                    Unattended connections require valid account ownership claims signed in MongoDB, ensuring only the authenticated host owner can initiate connections.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-bold text-white text-base mb-2">Zero Screen Recording</h4>
                                <p className="leading-relaxed text-slate-400">
                                    Chameleon operates purely in real-time RAM. Neither local disk nor cloud relays save video frames or input logs.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-bold text-white text-base mb-2">Future Security Roadmap</h4>
                                <p className="leading-relaxed text-slate-400">
                                    Upcoming releases will feature hardware WebAuthn (YubiKey) 2FA support, IP whitelist fencing, and enterprise audit logging.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Responsible Disclosure */}
                    <div className="bg-gradient-to-r from-amber-950/30 to-slate-900 border border-amber-500/30 rounded-3xl p-8 backdrop-blur-xl flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">Responsible Security Disclosure</h3>
                            <p className="text-slate-300 text-sm leading-relaxed mb-4">
                                Security is our highest priority. If you discover a vulnerability or security flaw in Chameleon software or infrastructure, please disclose it responsibly to our security team.
                            </p>
                            <a 
                                href="mailto:security@chameleon.dev" 
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition-colors"
                            >
                                Report Vulnerability (security@chameleon.dev)
                            </a>
                        </div>
                    </div>
                </section>

                {/* Security FAQ */}
                <section className="px-6 max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-white text-center mb-10">
                        Security FAQ
                    </h2>
                    <Accordion items={securityFaqs} />
                </section>
            </div>

            <Footer />
        </div>
    );
}
