import SEOHead from '../components/common/SEOHead';
import PageHero from '../components/common/PageHero';
import Accordion from '../components/common/Accordion';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { FAQS_DATA } from '../constants/data';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

export default function FAQPage() {
    return (
        <div className="min-h-screen bg-[#090D17] text-[#9CA3AF] font-sans selection:bg-[#06B6D4]/30 selection:text-cyan-200">
            <SEOHead
                title="Frequently Asked Questions (FAQ)"
                description="Find answers to common questions about Chameleon Remote Desktop security, device pairing, free usage, firewall compatibility, and privacy."
                canonical="https://www.chameleon-agent.online/faq"
            />
            <Navbar />

            <div className="relative z-10 pb-24">
                <PageHero
                    badge="Frequently Asked Questions"
                    title="Got questions?"
                    titleGradient="We have answers."
                    subtitle="Everything you need to know about Chameleon security, WebRTC architecture, performance, and host management."
                />

                {/* FAQ Accordion */}
                <section className="px-6 max-w-4xl mx-auto mb-20 border-t border-white/5 pt-12">
                    <Accordion items={FAQS_DATA} />
                </section>

                {/* Support CTA */}
                <section className="px-6 max-w-3xl mx-auto">
                    <div className="liquid-glass-card rounded-3xl p-10 text-center">
                        {/* Ambient glow */}
                        <div className="w-14 h-14 rounded-2xl liquid-glass-badge flex items-center justify-center text-[#06B6D4] mx-auto mb-5">
                            <MessageSquare size={26} />
                        </div>
                        <h3 className="text-2xl font-bold text-[#F3F4F6] mb-2">Still have questions?</h3>
                        <p className="text-[#9CA3AF] text-sm mb-8 max-w-md mx-auto leading-relaxed">
                            Can't find the answer you're looking for? Reach out to our technical support engineering team directly.
                        </p>
                        <Link
                            to="/contact"
                            className="inline-flex items-center justify-center px-8 py-3 rounded-2xl liquid-glass-btn-primary text-white font-bold text-sm"
                        >
                            Contact Technical Support
                        </Link>
                    </div>
                </section>
            </div>

            <Footer />
        </div>
    );
}
