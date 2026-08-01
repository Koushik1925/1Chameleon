import SEOHead from '../components/common/SEOHead';
import PageHero from '../components/common/PageHero';
import FeatureCard from '../components/common/FeatureCard';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { FEATURES_DATA } from '../constants/data';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function FeaturesPage() {
    return (
        <div className="min-h-screen bg-[#090D17] text-[#9CA3AF] font-sans selection:bg-[#06B6D4]/30 selection:text-cyan-200">
            <SEOHead 
                title="Features & Capabilities" 
                description="Explore Chameleon's ultra-low latency WebRTC streaming, end-to-end encryption, 60 FPS performance, and unattended device management."
                canonical="https://www.chameleon-agent.online/features"
            />
            <Navbar />

            <div className="relative z-10">
                <PageHero 
                    badge="High-Performance Engine"
                    title="Remote Desktop"
                    titleGradient="Built for Speed."
                    subtitle="Control any computer securely with ultra-low latency, end-to-end encryption, and a modern remote desktop experience."
                    ctaText="Download Agent"
                    ctaLink="/downloads"
                    secondaryCtaText="Connect Web Client"
                    secondaryCtaLink="/connect"
                />

                {/* Feature Cards Grid Section - Alternate background (#0D1320) */}
                <section className="py-24 px-6 border-t border-white/5 bg-[#0D1320]">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
                            <h2 className="text-3xl md:text-4xl font-bold text-[#F3F4F6] tracking-tight">
                                Engineered for Commercial Performance
                            </h2>
                            <p className="text-[#9CA3AF] text-base">
                                Built from the ground up for zero-latency screen sharing, cross-network NAT traversal, and high-fps remote control.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {FEATURES_DATA.map((feat) => (
                                <FeatureCard 
                                    key={feat.id}
                                    title={feat.title}
                                    description={feat.description}
                                    icon={feat.icon}
                                    status={feat.status}
                                    category={feat.category}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Bottom CTA Banner - Alternate background (#090D17) */}
                <section className="py-24 px-6 bg-[#090D17] border-t border-white/5">
                    <div className="max-w-5xl mx-auto bg-[#111827]/72 border border-white/6 rounded-[18px] p-10 md:p-16 text-center backdrop-blur-[12px] relative overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.45)]">
                        
                        <div className="inline-flex items-center gap-2 text-[#06B6D4] text-xs font-mono font-semibold uppercase tracking-[0.15em] mb-6">
                            <ShieldCheck size={14} className="text-[#22C55E]" />
                            Zero Complex Setup
                        </div>

                        <h2 className="text-3xl md:text-5xl font-bold text-[#F3F4F6] tracking-tight mb-6">
                            Ready to Experience Ultra-Low Latency?
                        </h2>
                        <p className="text-[#9CA3AF] max-w-xl mx-auto mb-10 text-base md:text-lg">
                            Get started in seconds with our Windows Desktop Agent or launch direct browser connections immediately.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link 
                                to="/downloads" 
                                className="h-12 px-8 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#06B6D4] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(6,182,212,0.3)] text-white font-bold flex items-center gap-2 active:scale-98 transition-all duration-150 ease-out shadow-md"
                            >
                                Download for Windows
                                <ArrowRight size={18} />
                            </Link>
                            <Link 
                                to="/connect" 
                                className="h-12 px-8 rounded-xl bg-transparent hover:bg-white/5 text-[#F3F4F6] font-semibold border border-white/8 flex items-center justify-center active:scale-98 transition-all duration-150 ease-out"
                            >
                                Open Web Client
                            </Link>
                        </div>
                    </div>
                </section>
            </div>

            <Footer />
        </div>
    );
}
