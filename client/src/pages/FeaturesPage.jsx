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
        <div className="min-h-screen bg-[#0b0f14] text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
            <SEOHead 
                title="Features & Capabilities" 
                description="Explore Chameleon's ultra-low latency WebRTC streaming, end-to-end encryption, 60 FPS performance, and unattended device management."
                canonical="https://chameleon-jet.vercel.app/features"
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

                {/* Feature Cards Grid Section */}
                <section className="py-16 px-6 max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
                        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                            Engineered for Commercial Performance
                        </h2>
                        <p className="text-slate-400 text-base">
                            Built from the ground up for zero-latency screen sharing, cross-network NAT traversal, and high-fps remote control.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                </section>

                {/* Bottom CTA Banner */}
                <section className="py-20 px-6">
                    <div className="max-w-5xl mx-auto bg-gradient-to-r from-cyan-950/40 via-slate-900 to-blue-950/40 border border-cyan-500/20 rounded-3xl p-10 md:p-16 text-center backdrop-blur-xl relative overflow-hidden shadow-2xl">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="inline-flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-widest mb-4">
                            <ShieldCheck size={14} />
                            Zero Complex Setup
                        </div>

                        <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-6">
                            Ready to Experience Ultra-Low Latency?
                        </h2>
                        <p className="text-slate-300 max-w-xl mx-auto mb-8 text-base md:text-lg">
                            Get started in seconds with our Windows Desktop Agent or launch direct browser connections immediately.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link 
                                to="/downloads" 
                                className="h-12 px-8 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold flex items-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all"
                            >
                                Download for Windows
                                <ArrowRight size={18} />
                            </Link>
                            <Link 
                                to="/connect" 
                                className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium border border-slate-700 flex items-center"
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
