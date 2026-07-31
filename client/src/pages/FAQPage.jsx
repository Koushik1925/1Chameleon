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
        <div className="min-h-screen bg-[#0B0F1A] text-[#E5E7EB] font-sans selection:bg-[#06B6D4]/30 selection:text-cyan-200">
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
                <section className="px-6 max-w-3xl mx-auto text-center bg-[#111827] border border-[#1F2937] rounded-2xl p-10 backdrop-blur-xl">
                    <div className="text-[#06B6D4] flex items-center justify-center mx-auto mb-3">
                        <MessageSquare size={28} />
                    </div>
                    <h3 className="text-2xl font-bold text-[#E5E7EB] mb-2">Still have questions?</h3>
                    <p className="text-[#9CA3AF] text-sm mb-6 max-w-md mx-auto">
                        Can't find the answer you're looking for? Reach out to our technical support engineering team directly.
                    </p>
                    <Link 
                        to="/contact" 
                        className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#06B6D4] hover:opacity-95 text-white font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.25)] active:scale-98 transition-all"
                    >
                        Contact Technical Support
                    </Link>
                </section>
            </div>

            <Footer />
        </div>
    );
}
