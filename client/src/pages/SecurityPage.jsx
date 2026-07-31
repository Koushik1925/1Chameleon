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
        <div className="min-h-screen bg-[#0B0F1A] text-[#E5E7EB] font-sans selection:bg-[#06B6D4]/30 selection:text-cyan-200">
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
                        
                        <div className="bg-[#111827] border border-[#1F2937] hover:border-[#22C55E]/50 rounded-2xl p-8 backdrop-blur-xl transition-all">
                            <div className="w-12 h-12 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] flex items-center justify-center mb-6">
                                <Lock size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-[#E5E7EB] mb-3">End-to-End Encryption</h3>
                            <p className="text-[#9CA3AF] text-sm leading-relaxed">
                                All media streams and remote control inputs are encrypted using WebRTC DTLS 1.2 and SRTP with AES-GCM 256-bit keys negotiated directly between peers.
                            </p>
                        </div>

                        <div className="bg-[#111827] border border-[#1F2937] hover:border-[#3B82F6]/50 rounded-2xl p-8 backdrop-blur-xl transition-all">
                            <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-[#3B82F6] flex items-center justify-center mb-6">
                                <Server size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-[#E5E7EB] mb-3">TLS 1.3 Signaling</h3>
                            <p className="text-[#9CA3AF] text-sm leading-relaxed">
                                Signaling exchanges (SDP offers, answers, and ICE candidate discovery) take place over secure WebSockets TLS 1.3 channels.
                            </p>
                        </div>

                        <div className="bg-[#111827] border border-[#1F2937] hover:border-[#8B5CF6]/50 rounded-2xl p-8 backdrop-blur-xl transition-all">
                            <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-[#8B5CF6] flex items-center justify-center mb-6">
                                <Key size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-[#E5E7EB] mb-3">Cryptographic Device Identity</h3>
                            <p className="text-[#9CA3AF] text-sm leading-relaxed">
                                Host hardware IDs are derived using system specs and signed JWT refresh tokens, preventing impersonation or unauthorized host claiming.
                            </p>
                        </div>

                    </div>
                </section>

                {/* Detailed Security Controls */}
                <section className="px-6 max-w-5xl mx-auto mb-20 space-y-8">
                    <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8 md:p-12 backdrop-blur-xl space-y-6">
                        <h2 className="text-2xl md:text-3xl font-bold text-[#E5E7EB] flex items-center gap-3">
                            <ShieldCheck className="text-[#22C55E]" size={28} />
                            Multi-Layered Remote Access Controls
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-[#9CA3AF]">
                            <div>
                                <h4 className="font-bold text-[#E5E7EB] text-base mb-2">Session Approval Badges</h4>
                                <p className="leading-relaxed text-[#9CA3AF]">
                                    When an incoming connection is requested, the Desktop Agent displays an explicit green approval banner. Remote control can be paused instantly using global hotkey <code className="text-[#06B6D4] font-mono bg-[#0B0F1A] border border-[#1F2937] px-2 py-0.5 rounded-lg">Ctrl+Alt+P</code>.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-bold text-[#E5E7EB] text-base mb-2">Unattended Access Protection</h4>
                                <p className="leading-relaxed text-[#9CA3AF]">
                                    Unattended connections require valid account ownership claims signed in MongoDB, ensuring only the authenticated host owner can initiate connections.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-bold text-[#E5E7EB] text-base mb-2">Zero Screen Recording</h4>
                                <p className="leading-relaxed text-[#9CA3AF]">
                                    Chameleon operates purely in real-time RAM. Neither local disk nor cloud relays save video frames or input logs.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-bold text-[#E5E7EB] text-base mb-2">Future Security Roadmap</h4>
                                <p className="leading-relaxed text-[#9CA3AF]">
                                    Upcoming releases will feature hardware WebAuthn (YubiKey) 2FA support, IP whitelist fencing, and enterprise audit logging.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Responsible Disclosure */}
                    <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8 backdrop-blur-xl flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[#E5E7EB] mb-2">Responsible Security Disclosure</h3>
                            <p className="text-[#9CA3AF] text-sm leading-relaxed mb-4">
                                Security is our highest priority. If you discover a vulnerability or security flaw in Chameleon software or infrastructure, please disclose it responsibly to our security team.
                            </p>
                            <a 
                                href="mailto:chameleonagent.contact@gmail.com" 
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-xl transition-colors"
                            >
                                Report Vulnerability (chameleonagent.contact@gmail.com)
                            </a>
                        </div>
                    </div>
                </section>

                {/* Security FAQ */}
                <section className="px-6 max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-[#E5E7EB] text-center mb-10">
                        Security FAQ
                    </h2>
                    <Accordion items={securityFaqs} />
                </section>
            </div>

            <Footer />
        </div>
    );
}
