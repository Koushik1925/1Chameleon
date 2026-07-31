import SEOHead from '../components/common/SEOHead';
import PageHero from '../components/common/PageHero';
import Timeline from '../components/common/Timeline';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { CHANGELOG_RELEASES } from '../constants/data';
import { Rocket, Sparkles, Shield, Cpu } from 'lucide-react';

export default function ChangelogPage() {
    return (
        <div className="min-h-screen bg-[#0B0F1A] text-[#E5E7EB] font-sans selection:bg-[#06B6D4]/30 selection:text-cyan-200">
            <SEOHead 
                title="Product Changelog & Release Notes" 
                description="Stay updated with Chameleon software releases, Desktop Agent updates, WebRTC performance enhancements, and future feature roadmaps."
                canonical="https://chameleon-jet.vercel.app/changelog"
            />
            <Navbar />

            <div className="relative z-10 pb-20">
                <PageHero 
                    badge="Product Updates"
                    title="Chameleon"
                    titleGradient="Changelog"
                    subtitle="Track software releases, feature additions, security enhancements, and performance optimizations."
                />

                {/* Release Timeline Section */}
                <section className="px-6 max-w-5xl mx-auto mb-24">
                    <Timeline releases={CHANGELOG_RELEASES} />
                </section>

                {/* Future Roadmap Section */}
                <section className="px-6 max-w-4xl mx-auto">
                    <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8 md:p-12 backdrop-blur-xl space-y-8 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#22C55E]/10 via-[#06B6D4]/10 to-[#8B5CF6]/10 border border-[#1F2937] text-[#06B6D4] flex items-center justify-center shrink-0">
                                <Rocket size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-[#E5E7EB] tracking-tight">Future Engineering Roadmap</h2>
                                <p className="text-[#9CA3AF] text-sm">Upcoming features currently in active development.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-[#0B0F1A] border border-[#1F2937] p-5 rounded-2xl space-y-2">
                                <h4 className="font-bold text-[#E5E7EB] text-base flex items-center gap-2">
                                    <Sparkles size={18} className="text-[#06B6D4]" />
                                    macOS & Linux Native Agents
                                </h4>
                                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                                    Metal hardware acceleration for Apple Silicon M-series chips and X11/Wayland daemons for Ubuntu/Debian hosts.
                                </p>
                            </div>

                            <div className="bg-[#0B0F1A] border border-[#1F2937] p-5 rounded-2xl space-y-2">
                                <h4 className="font-bold text-[#E5E7EB] text-base flex items-center gap-2">
                                    <Shield size={18} className="text-[#22C55E]" />
                                    WebAuthn Hardware 2FA
                                </h4>
                                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                                    FIDO2 / YubiKey hardware authentication support for high-security enterprise device claiming.
                                </p>
                            </div>

                            <div className="bg-[#0B0F1A] border border-[#1F2937] p-5 rounded-2xl space-y-2">
                                <h4 className="font-bold text-[#E5E7EB] text-base flex items-center gap-2">
                                    <Cpu size={18} className="text-[#3B82F6]" />
                                    WebRTC DataChannel File Transfer
                                </h4>
                                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                                    Ultra-fast drag-and-drop file transfer over encrypted peer-to-peer data channels.
                                </p>
                            </div>

                            <div className="bg-[#0B0F1A] border border-[#1F2937] p-5 rounded-2xl space-y-2">
                                <h4 className="font-bold text-[#E5E7EB] text-base flex items-center gap-2">
                                    <Sparkles size={18} className="text-[#8B5CF6]" />
                                    Multi-Monitor Display Selector
                                </h4>
                                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                                    Seamlessly switch or mirror across multiple connected remote displays in real time.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <Footer />
        </div>
    );
}
