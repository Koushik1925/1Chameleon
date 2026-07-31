import SEOHead from '../components/common/SEOHead';
import PageHero from '../components/common/PageHero';
import ContactForm from '../components/common/ContactForm';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { Mail, Briefcase, Github, Clock, ShieldCheck } from 'lucide-react';

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-[#0b0f14] text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
            <SEOHead 
                title="Contact Support & Business Inquiries" 
                description="Get in touch with Chameleon technical support, report bugs, or submit business and enterprise inquiries."
                canonical="https://chameleon-jet.vercel.app/contact"
            />
            <Navbar />

            <div className="relative z-10 pb-20">
                <PageHero 
                    badge="Direct Engineering Support"
                    title="Need Help?"
                    titleGradient="Get in touch."
                    subtitle="We are here to assist with remote pairing, enterprise deployments, bug disclosures, and general questions."
                />

                <section className="px-6 max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                        
                        {/* Form Column */}
                        <div className="lg:col-span-7">
                            <ContactForm />
                        </div>

                        {/* Right Info Column */}
                        <div className="lg:col-span-5 space-y-6">
                            
                            {/* Support Email Card */}
                            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                                    <Mail size={22} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Technical Support</h4>
                                    <a href="mailto:chameleonagent.contact@gmail.com" className="text-base md:text-lg font-bold text-white hover:text-cyan-400 transition-colors break-all">
                                        chameleonagent.contact@gmail.com
                                    </a>
                                    <p className="text-xs text-slate-400 mt-1">Assistance with desktop agent pairing, WebRTC networks, and bug reports.</p>
                                </div>
                            </div>

                            {/* Business Email Card */}
                            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                                    <Briefcase size={22} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Business & Licensing</h4>
                                    <a href="mailto:chameleonagent.contact@gmail.com" className="text-base md:text-lg font-bold text-white hover:text-cyan-400 transition-colors break-all">
                                        chameleonagent.contact@gmail.com
                                    </a>
                                    <p className="text-xs text-slate-400 mt-1">Custom enterprise hosting, SLA support, and white-label inquiries.</p>
                                </div>
                            </div>

                            {/* GitHub Repository Card */}
                            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                                    <Github size={22} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">GitHub Repository</h4>
                                    <a href="https://github.com/Rithvik-krishna/Chameleon" target="_blank" rel="noopener noreferrer" className="text-lg font-bold text-white hover:text-cyan-400 transition-colors">
                                        Rithvik-krishna/Chameleon
                                    </a>
                                    <p className="text-xs text-slate-400 mt-1">Submit issues, inspect open source code, or contribute pull requests.</p>
                                </div>
                            </div>

                            {/* Response Time Badge */}
                            <div className="bg-gradient-to-r from-cyan-950/30 to-slate-900 border border-cyan-500/20 rounded-2xl p-5 flex items-center gap-3">
                                <Clock size={20} className="text-cyan-400 shrink-0" />
                                <div className="text-xs text-slate-300">
                                    <span className="font-semibold text-white block">Response Time SLA</span>
                                    Average response time is less than <strong className="text-cyan-400 font-mono">24 hours</strong> on business days.
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
