import SEOHead from '../components/common/SEOHead';
import PageHero from '../components/common/PageHero';
import Accordion from '../components/common/Accordion';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { Lock, ShieldCheck, Key, Server, AlertTriangle } from 'lucide-react';

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

    const pillars = [
        {
            icon: Lock,
            color: 'text-[#22C55E]',
            bg: 'bg-[#22C55E]/10',
            border: 'border-[#22C55E]/20',
            hoverBorder: 'hover:border-[#22C55E]/40',
            title: 'End-to-End Encryption',
            desc: 'All media streams and remote control inputs are encrypted using WebRTC DTLS 1.2 and SRTP with AES-GCM 256-bit keys negotiated directly between peers.'
        },
        {
            icon: Server,
            color: 'text-[#3B82F6]',
            bg: 'bg-[#3B82F6]/10',
            border: 'border-[#3B82F6]/20',
            hoverBorder: 'hover:border-[#3B82F6]/40',
            title: 'TLS 1.3 Signaling',
            desc: 'Signaling exchanges (SDP offers, answers, and ICE candidate discovery) take place over secure WebSockets TLS 1.3 channels.'
        },
        {
            icon: Key,
            color: 'text-[#8B5CF6]',
            bg: 'bg-[#8B5CF6]/10',
            border: 'border-[#8B5CF6]/20',
            hoverBorder: 'hover:border-[#8B5CF6]/40',
            title: 'Cryptographic Device Identity',
            desc: 'Host hardware IDs are derived using system specs and signed JWT refresh tokens, preventing impersonation or unauthorized host claiming.'
        }
    ];

    const controls = [
        {
            title: 'Session Approval Badges',
            desc: <>When an incoming connection is requested, the Desktop Agent displays an explicit green approval banner. Remote control can be paused instantly using global hotkey <code className="text-[#06B6D4] font-mono bg-[#090D17] border border-white/8 px-2 py-0.5 rounded-lg text-[10px]">Ctrl+Alt+P</code>.</>
        },
        {
            title: 'Unattended Access Protection',
            desc: 'Unattended connections require valid account ownership claims signed in MongoDB, ensuring only the authenticated host owner can initiate connections.'
        },
        {
            title: 'Zero Screen Recording',
            desc: 'Chameleon operates purely in real-time RAM. Neither local disk nor cloud relays save video frames or input logs.'
        },
        {
            title: 'Future Security Roadmap',
            desc: 'Upcoming releases will feature hardware WebAuthn (YubiKey) 2FA support, IP whitelist fencing, and enterprise audit logging.'
        }
    ];

    return (
        <div className="min-h-screen bg-[#090D17] text-[#9CA3AF] font-sans selection:bg-[#06B6D4]/30 selection:text-cyan-200">
            <SEOHead
                title="Security Architecture & Encryption"
                description="Explore Chameleon's end-to-end DTLS-SRTP encryption, WebRTC security standards, device identity verification, and vulnerability disclosure policies."
                canonical="https://www.chameleon-agent.online/security"
            />
            <Navbar />

            <div className="relative z-10 pb-24">
                <PageHero
                    badge="Zero-Trust Architecture"
                    title="Security"
                    titleGradient="First."
                    subtitle="Chameleon is engineered from the ground up to guarantee that your remote desktop connections remain completely private, end-to-end encrypted, and uninspectable."
                />

                {/* Core Pillars */}
                <section className="px-6 max-w-7xl mx-auto mb-20 border-t border-white/5 pt-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {pillars.map(({ icon: Icon, color, bg, border, hoverBorder, title, desc }) => (
                            <div key={title} className={`liquid-glass-card rounded-3xl p-8 border ${border} ${hoverBorder}`}>
                                <div className={`w-12 h-12 rounded-2xl ${bg} border ${border} ${color} flex items-center justify-center mb-6`}>
                                    <Icon size={22} />
                                </div>
                                <h3 className="text-xl font-bold text-[#F3F4F6] mb-3">{title}</h3>
                                <p className="text-[#9CA3AF] text-sm leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Detailed Controls */}
                <section className="px-6 max-w-5xl mx-auto mb-20 space-y-6">
                    <div className="liquid-glass-card rounded-3xl p-8 md:p-12 space-y-8">
                        <h2 className="text-2xl md:text-3xl font-bold text-[#F3F4F6] flex items-center gap-3">
                            <ShieldCheck className="text-[#22C55E]" size={28} />
                            Multi-Layered Remote Access Controls
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {controls.map(({ title, desc }) => (
                                <div key={title}>
                                    <h4 className="font-bold text-[#F3F4F6] text-base mb-2">{title}</h4>
                                    <p className="text-[#9CA3AF] text-sm leading-relaxed">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Responsible Disclosure */}
                    <div className="liquid-glass-card rounded-3xl p-8 flex items-start gap-5 border border-amber-500/20">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                            <AlertTriangle size={22} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[#F3F4F6] mb-2">Responsible Security Disclosure</h3>
                            <p className="text-[#9CA3AF] text-sm leading-relaxed mb-4">
                                Security is our highest priority. If you discover a vulnerability or security flaw in Chameleon software or infrastructure, please disclose it responsibly.
                            </p>
                            <a
                                href="mailto:chameleonagent.contact@gmail.com"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500/15 border border-amber-500/25 hover:bg-amber-500/25 text-amber-300 font-bold text-xs rounded-xl transition-all duration-200"
                            >
                                Report Vulnerability → chameleonagent.contact@gmail.com
                            </a>
                        </div>
                    </div>
                </section>

                {/* Security FAQ */}
                <section className="px-6 max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-[#F3F4F6] text-center mb-12 tracking-tight">
                        Security FAQ
                    </h2>
                    <Accordion items={securityFaqs} />
                </section>
            </div>

            <Footer />
        </div>
    );
}
