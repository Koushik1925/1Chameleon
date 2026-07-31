import SEOHead from '../components/common/SEOHead';
import PageHero from '../components/common/PageHero';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { Trash2, AlertTriangle, ShieldCheck, Mail, CheckCircle2, Clock } from 'lucide-react';

export default function DeleteAccountPage() {
    return (
        <div className="min-h-screen bg-[#0b0f14] text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
            <SEOHead 
                title="Delete Your Account" 
                description="Information and step-by-step instructions on purging your Chameleon account, unlinking host devices, and permanent data removal."
                canonical="https://chameleon-jet.vercel.app/delete-account"
            />
            <Navbar />

            <div className="relative z-10 pb-20">
                <PageHero 
                    badge="Account Management"
                    title="Delete Your"
                    titleGradient="Chameleon Account"
                    subtitle="Understand what data gets removed, retention windows, and how to request permanent account purging."
                />

                <div className="px-6 max-w-4xl mx-auto space-y-8">
                    
                    {/* Warning Banner */}
                    <div className="bg-red-950/40 border-2 border-red-500/30 rounded-3xl p-8 backdrop-blur-xl flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">Permanent Account Deletion Warning</h3>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                Deleting your Chameleon account is a permanent action. All your claimed host devices, saved pairing credentials, session history, and profile data will be permanently erased and cannot be restored after the 30-day grace period.
                            </p>
                        </div>
                    </div>

                    {/* Breakdown Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* What Gets Deleted */}
                        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl space-y-4">
                            <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                                <CheckCircle2 size={20} />
                                What Gets Deleted
                            </h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0"></span>
                                    <span>Account profile (Name, email address, profile picture URL)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0"></span>
                                    <span>All claimed desktop host hardware IDs & tokens</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0"></span>
                                    <span>Unattended access authorization keys</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0"></span>
                                    <span>Saved session connection logs</span>
                                </li>
                            </ul>
                        </div>

                        {/* What Gets Retained & Timeline */}
                        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl space-y-4">
                            <h3 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                                <Clock size={20} />
                                Timeline & Retention
                            </h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0"></span>
                                    <span><strong className="text-white">Immediate Effect:</strong> Account is deactivated and unlinked from claimed host agents.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0"></span>
                                    <span><strong className="text-white">30-Day Purge Window:</strong> Data is completely overwritten and permanently removed from MongoDB Atlas backups within 30 days.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0"></span>
                                    <span><strong className="text-white">Recovery Period:</strong> You may cancel deletion within 14 days by emailing support.</span>
                                </li>
                            </ul>
                        </div>

                    </div>

                    {/* Step-by-Step Instructions */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 md:p-10 backdrop-blur-xl space-y-6">
                        <h3 className="text-2xl font-bold text-white">How to Submit Account Deletion Request</h3>
                        
                        <div className="space-y-4 text-slate-300 text-sm">
                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono font-bold shrink-0">1</div>
                                <div>
                                    <h4 className="font-bold text-white">Unclaim Host Devices</h4>
                                    <p className="text-slate-400">Go to your <a href="/my-devices" className="text-cyan-400 underline">My Devices</a> dashboard and click "Disconnect PC" on any claimed desktop hosts.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono font-bold shrink-0">2</div>
                                <div>
                                    <h4 className="font-bold text-white">Send Deletion Email Request</h4>
                                    <p className="text-slate-400">Email our privacy team at <a href="mailto:privacy@chameleon.dev?subject=Account Deletion Request" className="text-cyan-400 underline font-mono">privacy@chameleon.dev</a> from your registered account email address with the subject line <em>"Account Deletion Request"</em>.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono font-bold shrink-0">3</div>
                                <div>
                                    <h4 className="font-bold text-white">Confirmation & Deactivation</h4>
                                    <p className="text-slate-400">Our privacy team will verify your account ownership and send a final confirmation email once the 30-day deletion process begins.</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <a 
                                href="mailto:privacy@chameleon.dev?subject=Account Deletion Request"
                                className="w-full sm:w-auto px-6 py-3 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all"
                            >
                                <Trash2 size={18} />
                                Email privacy@chameleon.dev to Delete
                            </a>

                            <div className="text-xs text-slate-400 flex items-center gap-1.5">
                                <Mail size={14} className="text-slate-500" />
                                <span>Direct Support: support@chameleon.dev</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <Footer />
        </div>
    );
}
