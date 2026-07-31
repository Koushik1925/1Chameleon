import SEOHead from '../components/common/SEOHead';
import PageHero from '../components/common/PageHero';
import Accordion from '../components/common/Accordion';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { FAQS_DATA } from '../constants/data';
import { Link } from 'react-router-dom';
import { HelpCircle, MessageSquare } from 'lucide-react';

export default function FAQPage() {
    return (
        <div className="min-h-screen bg-[#0b0f14] text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
            <SEOHead 
                title="Frequently Asked Questions (FAQ)" 
                description="Find answers to common questions about Chameleon Remote Desktop security, device pairing, free usage, firewall compatibility, and privacy."
                canonical="https://chameleon-jet.vercel.app/faq"
            />
            <Navbar />

            <div className="relative z-10 pb-20">
                <PageHero 
                    badge="Frequently Asked Questions"
                    title="Got questions?"
                    titleGradient="We have answers."
                    subtitle="Everything you need to know about Chameleon security, WebRTC architecture, performance, and host management."
                />

                {/* FAQ Accordion List */}
                <section className="px-6 max-w-4xl mx-auto mb-20">
                    <Accordion items={FAQS_DATA} />
                </section>

                {/* Support CTA */}
                <section className="px-6 max-w-3xl mx-auto text-center bg-slate-900/60 border border-slate-800 rounded-3xl p-10 backdrop-blur-xl">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto mb-4">
                        <MessageSquare size={24} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Still have questions?</h3>
                    <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
                        Can't find the answer you're looking for? Reach out to our technical support engineering team directly.
                    </p>
                    <Link 
                        to="/contact" 
                        className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-400 hover:bg-cyan-300 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
                    >
                        Contact Support Team
                    </Link>
                </section>
            </div>

            <Footer />
        </div>
    );
}
