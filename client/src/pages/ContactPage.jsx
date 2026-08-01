import SEOHead from '../components/common/SEOHead';
import PageHero from '../components/common/PageHero';
import ContactForm from '../components/common/ContactForm';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { Mail, Briefcase, Clock } from 'lucide-react';

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-[#090D17] text-[#9CA3AF] font-sans selection:bg-[#06B6D4]/30 selection:text-cyan-200">
            <SEOHead
                title="Contact Support & Business Inquiries"
                description="Get in touch with Chameleon technical support, report bugs, or submit business and enterprise inquiries."
                canonical="https://chameleon-jet.vercel.app/contact"
            />
            <Navbar />

            <div className="relative z-10 pb-24">
                <PageHero
                    badge="Direct Engineering Support"
                    title="Need Help?"
                    titleGradient="Get in touch."
                    subtitle="We are here to assist with remote pairing, enterprise deployments, bug disclosures, and general questions."
                />

                <section className="px-6 max-w-6xl mx-auto border-t border-white/5 pt-12">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

                        {/* Form Column */}
                        <div className="lg:col-span-7">
                            <ContactForm />
                        </div>

                        {/* Right Info Column */}
                        <div className="lg:col-span-5 space-y-4">

                            {/* Support Email Card */}
                            <div className="bg-[#111827]/72 border border-white/6 rounded-[18px] p-6 backdrop-blur-[12px] flex items-start gap-4 hover:border-[#06B6D4]/35 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(0,0,0,0.45)] transition-all duration-150 ease-out">
                                <div className="w-12 h-12 rounded-xl bg-[#090D17] border border-white/5 text-[#06B6D4] flex items-center justify-center shrink-0">
                                    <Mail size={22} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-1">Technical Support</h4>
                                    <a href="mailto:chameleonagent.contact@gmail.com" className="text-base md:text-lg font-bold text-[#F3F4F6] hover:text-[#06B6D4] transition-colors break-all">
                                        chameleonagent.contact@gmail.com
                                    </a>
                                    <p className="text-xs text-[#9CA3AF] mt-1">Assistance with desktop agent pairing, WebRTC networks, and bug reports.</p>
                                </div>
                            </div>

                            {/* Business Email Card */}
                            <div className="bg-[#111827]/72 border border-white/6 rounded-[18px] p-6 backdrop-blur-[12px] flex items-start gap-4 hover:border-[#06B6D4]/35 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(0,0,0,0.45)] transition-all duration-150 ease-out">
                                <div className="w-12 h-12 rounded-xl bg-[#090D17] border border-white/5 text-[#06B6D4] flex items-center justify-center shrink-0">
                                    <Briefcase size={22} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-1">Business &amp; Licensing</h4>
                                    <a href="mailto:chameleonagent.contact@gmail.com" className="text-base md:text-lg font-bold text-[#F3F4F6] hover:text-[#06B6D4] transition-colors break-all">
                                        chameleonagent.contact@gmail.com
                                    </a>
                                    <p className="text-xs text-[#9CA3AF] mt-1">Custom enterprise hosting, SLA support, and white-label inquiries.</p>
                                </div>
                            </div>


                            {/* Response Time Badge */}
                            <div className="bg-[#111827]/72 border border-white/6 rounded-[18px] p-5 backdrop-blur-[12px] flex items-center gap-3">
                                <Clock size={20} className="text-[#22C55E] shrink-0" />
                                <div className="text-xs text-[#9CA3AF]">
                                    <span className="font-semibold text-[#F3F4F6] block">Response Time SLA</span>
                                    Average response time is less than <strong className="text-[#06B6D4] font-mono">24 hours</strong> on business days.
                                </div>
                            </div>

                        </div>
                    </div>
                </section>
            </div>

            <Footer />
        </div>
    );
}
