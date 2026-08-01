import SEOHead from '../components/common/SEOHead';
import PageHero from '../components/common/PageHero';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { Trash2, AlertTriangle, Mail, CheckCircle2, Clock } from 'lucide-react';

export default function DeleteAccountPage() {
    return (
        <div className="min-h-screen bg-[#090D17] text-[#9CA3AF] font-sans selection:bg-red-500/30 selection:text-red-200">
            <SEOHead 
                title="Delete Your Account" 
                description="Information and step-by-step instructions on purging your Chameleon account, unlinking host devices, and permanent data removal."
                canonical="https://www.chameleon-agent.online/delete-account"
            />
            <Navbar />

            <div className="relative z-10 pb-24">
                <PageHero 
                    badge="Account Management"
                    title="Delete Your"
                    titleGradient="Chameleon Account"
                    subtitle="Understand what data gets removed, retention windows, and how to request permanent account purging."
                />

                <div className="px-6 max-w-4xl mx-auto space-y-8">
                    
                    {/* Warning Banner */}
                    <div className="bg-red-950/30 border border-red-500/25 rounded-[18px] p-8 backdrop-blur-[12px] flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[#F3F4F6] mb-2">Permanent Account Deletion Warning</h3>
                            <p className="text-[#9CA3AF] text-sm leading-relaxed">
                                Deleting your Chameleon account is a permanent action. All your claimed host devices, saved pairing credentials, session history, and profile data will be permanently erased and cannot be restored after the 30-day grace period.
                            </p>
                        </div>
                    </div>

                    {/* Breakdown Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* What Gets Deleted */}
                        <div className="bg-[#111827]/72 border border-white/6 rounded-[18px] p-8 backdrop-blur-[12px] space-y-4 shadow-[0_15px_40px_rgba(0,0,0,0.45)] hover:border-white/10 transition-all duration-150 ease-out">
                            <h3 className="text-xl font-bold text-[#22C55E] flex items-center gap-2">
                                <CheckCircle2 size={20} />
                                What Gets Deleted
                            </h3>
                            <ul className="space-y-2 text-sm text-[#9CA3AF]">
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] mt-2 shrink-0"></span>
                                    <span>Account profile (Name, email address, profile picture URL)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] mt-2 shrink-0"></span>
                                    <span>All claimed desktop host hardware IDs &amp; tokens</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] mt-2 shrink-0"></span>
                                    <span>Unattended access authorization keys</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] mt-2 shrink-0"></span>
                                    <span>Saved session connection logs</span>
                                </li>
                            </ul>
                        </div>

                        {/* What Gets Retained & Timeline */}
                        <div className="bg-[#111827]/72 border border-white/6 rounded-[18px] p-8 backdrop-blur-[12px] space-y-4 shadow-[0_15px_40px_rgba(0,0,0,0.45)] hover:border-white/10 transition-all duration-150 ease-out">
                            <h3 className="text-xl font-bold text-[#06B6D4] flex items-center gap-2">
                                <Clock size={20} />
                                Timeline &amp; Retention
                            </h3>
                            <ul className="space-y-2 text-sm text-[#9CA3AF]">
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] mt-2 shrink-0"></span>
                                    <span><strong className="text-[#F3F4F6]">Immediate Effect:</strong> Account is deactivated and unlinked from claimed host agents.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] mt-2 shrink-0"></span>
                                    <span><strong className="text-[#F3F4F6]">30-Day Purge Window:</strong> Data is completely overwritten and permanently removed from MongoDB Atlas backups within 30 days.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] mt-2 shrink-0"></span>
                                    <span><strong className="text-[#F3F4F6]">Recovery Period:</strong> You may cancel deletion within 14 days by emailing support.</span>
                                </li>
                            </ul>
                        </div>

                    </div>

                    {/* Step-by-Step Instructions */}
                    <div className="bg-[#111827]/72 border border-white/6 rounded-[18px] p-8 md:p-10 backdrop-blur-[12px] space-y-6 shadow-[0_15px_40px_rgba(0,0,0,0.45)]">
                        <h3 className="text-2xl font-bold text-[#F3F4F6]">How to Submit Account Deletion Request</h3>
                        
                        <div className="space-y-4 text-[#9CA3AF] text-sm">
                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-xl bg-[#090D17] border border-white/5 text-[#06B6D4] flex items-center justify-center font-mono font-bold shrink-0">1</div>
                                <div>
                                    <h4 className="font-bold text-[#F3F4F6]">Unclaim Host Devices</h4>
                                    <p className="text-[#9CA3AF]">Go to your <a href="/my-devices" className="text-[#06B6D4] underline">My Devices</a> dashboard and click "Disconnect PC" on any claimed desktop hosts.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-xl bg-[#090D17] border border-white/5 text-[#06B6D4] flex items-center justify-center font-mono font-bold shrink-0">2</div>
                                <div>
                                    <h4 className="font-bold text-[#F3F4F6]">Send Deletion Email Request</h4>
                                    <p className="text-[#9CA3AF]">Email our privacy team at <a href="mailto:chameleonagent.contact@gmail.com?subject=Account Deletion Request" className="text-[#06B6D4] underline font-mono">chameleonagent.contact@gmail.com</a> from your registered account email address with the subject line <em>"Account Deletion Request"</em>.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-xl bg-[#090D17] border border-white/5 text-[#06B6D4] flex items-center justify-center font-mono font-bold shrink-0">3</div>
                                <div>
                                    <h4 className="font-bold text-[#F3F4F6]">Confirmation &amp; Deactivation</h4>
                                    <p className="text-[#9CA3AF]">Our privacy team will verify your account ownership and send a final confirmation email once the 30-day deletion process begins.</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <a 
                                href="mailto:chameleonagent.contact@gmail.com?subject=Account Deletion Request"
                                className="w-full sm:w-auto px-6 py-3 bg-red-600/90 hover:bg-red-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.25)] active:scale-98 transition-all duration-150 ease-out"
                            >
                                <Trash2 size={18} />
                                Email chameleonagent.contact@gmail.com to Delete
                            </a>

                            <div className="text-xs text-[#9CA3AF] flex items-center gap-1.5">
                                <Mail size={14} className="text-[#9CA3AF]" />
                                <span>Direct Support: chameleonagent.contact@gmail.com</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <Footer />
        </div>
    );
}
