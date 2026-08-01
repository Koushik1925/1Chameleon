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

                {/* FAQ Accordion List */}
                <section className="px-6 max-w-4xl mx-auto mb-20 border-t border-white/5 pt-12">
                    <Accordion items={FAQS_DATA} />
                </section>

                {/* Support CTA */}
                <section className="px-6 max-w-3xl mx-auto">
                    <div className="text-center bg-[#111827]/72 border border-white/6 rounded-[18px] p-10 backdrop-blur-[12px] shadow-[0_15px_40px_rgba(0,0,0,0.45)]">
                        <div className="text-[#06B6D4] flex items-center justify-center mx-auto mb-4">
                            <MessageSquare size={28} />
                        </div>
                        <h3 className="text-2xl font-bold text-[#F3F4F6] mb-2">Still have questions?</h3>
                        <p className="text-[#9CA3AF] text-sm mb-8 max-w-md mx-auto">
                            Can't find the answer you're looking for? Reach out to our technical support engineering team directly.
                        </p>
                        <Link
                            to="/contact"
                            className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#06B6D4] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(6,182,212,0.3)] text-white font-bold text-sm active:scale-98 transition-all duration-150 ease-out shadow-md"
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
