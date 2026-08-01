import SEOHead from '../components/common/SEOHead';
import PageHero from '../components/common/PageHero';
import Timeline from '../components/common/Timeline';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { CHANGELOG_RELEASES } from '../constants/data';
import { Rocket, Sparkles, Shield, Cpu } from 'lucide-react';

const roadmapItems = [
    {
        icon: Sparkles,
        color: 'text-[#06B6D4]',
        accent: 'border-[#06B6D4]/20 hover:border-[#06B6D4]/40',
        title: 'macOS & Linux Native Agents',
        desc: 'Metal hardware acceleration for Apple Silicon M-series chips and X11/Wayland daemons for Ubuntu/Debian hosts.'
    },
    {
        icon: Shield,
        color: 'text-[#22C55E]',
        accent: 'border-[#22C55E]/20 hover:border-[#22C55E]/40',
        title: 'WebAuthn Hardware 2FA',
        desc: 'FIDO2 / YubiKey hardware authentication support for high-security enterprise device claiming.'
    },
    {
        icon: Cpu,
        color: 'text-[#3B82F6]',
        accent: 'border-[#3B82F6]/20 hover:border-[#3B82F6]/40',
        title: 'WebRTC DataChannel File Transfer',
        desc: 'Ultra-fast drag-and-drop file transfer over encrypted peer-to-peer data channels.'
    },
    {
        icon: Sparkles,
        color: 'text-[#8B5CF6]',
        accent: 'border-[#8B5CF6]/20 hover:border-[#8B5CF6]/40',
        title: 'Multi-Monitor Display Selector',
        desc: 'Seamlessly switch or mirror across multiple connected remote displays in real time.'
    }
];

export default function ChangelogPage() {
    return (
        <div className="min-h-screen bg-[#090D17] text-[#9CA3AF] font-sans selection:bg-[#06B6D4]/30 selection:text-cyan-200">
            <SEOHead
                title="Product Changelog & Release Notes"
                description="Stay updated with Chameleon software releases, Desktop Agent updates, WebRTC performance enhancements, and future feature roadmaps."
                canonical="https://www.chameleon-agent.online/changelog"
            />
            <Navbar />

            <div className="relative z-10 pb-24">
                <PageHero
                    badge="Product Updates"
                    title="Chameleon"
                    titleGradient="Changelog"
                    subtitle="Track software releases, feature additions, security enhancements, and performance optimizations."
                />

                {/* Release Timeline */}
                <section className="px-6 max-w-5xl mx-auto mb-24 border-t border-white/5 pt-12">
                    <Timeline releases={CHANGELOG_RELEASES} />
                </section>

                {/* Roadmap */}
                <section className="px-6 max-w-4xl mx-auto">
                    <div className="liquid-glass-card rounded-3xl p-8 md:p-12 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl liquid-glass-badge text-[#06B6D4] flex items-center justify-center shrink-0">
                                <Rocket size={22} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-[#F3F4F6] tracking-tight">Future Engineering Roadmap</h2>
                                <p className="text-[#9CA3AF] text-sm">Upcoming features currently in active development.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {roadmapItems.map(({ icon: Icon, color, accent, title, desc }) => (
                                <div key={title} className={`liquid-glass-card rounded-2xl p-5 space-y-2 border ${accent} transition-all duration-250`}>
                                    <h4 className={`font-bold text-[#F3F4F6] text-sm flex items-center gap-2`}>
                                        <Icon size={16} className={color} />
                                        {title}
                                    </h4>
                                    <p className="text-xs text-[#9CA3AF] leading-relaxed">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>

            <Footer />
        </div>
    );
}
