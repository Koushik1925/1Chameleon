import { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ContactForm() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: 'General Support',
        message: ''
    });
    const [status, setStatus] = useState('idle'); // idle | submitting | success | error
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.message) {
            setStatus('error');
            setErrorMsg('Please fill in all required fields.');
            return;
        }

        setStatus('submitting');
        setErrorMsg('');

        try {
            // Simulated submission with high perceived responsiveness
            await new Promise((resolve) => setTimeout(resolve, 800));
            setStatus('success');
            setFormData({ name: '', email: '', subject: 'General Support', message: '' });
        } catch (err) {
            setStatus('error');
            setErrorMsg('Failed to send message. Please try again or email chameleonagent.contact@gmail.com directly.');
        }
    };

    return (
        <div className="bg-[#111827]/72 border border-white/6 rounded-[18px] p-8 backdrop-blur-[12px] shadow-[0_15px_40px_rgba(0,0,0,0.45)]">
            <h3 className="text-2xl font-bold text-[#F3F4F6] mb-6">Send Us a Message</h3>

            {status === 'success' ? (
                <div className="p-6 bg-[#090D17] border border-white/5 rounded-xl text-center space-y-3 animate-in fade-in duration-150">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-[#22C55E] flex items-center justify-center mx-auto">
                        <CheckCircle2 size={24} />
                    </div>
                    <h4 className="text-xl font-bold text-[#F3F4F6]">Message Received!</h4>
                    <p className="text-[#9CA3AF] text-sm leading-relaxed">
                        Thank you for reaching out to Chameleon Support. Our engineering team will review your inquiry and respond within 24 hours.
                    </p>
                    <button 
                        onClick={() => setStatus('idle')}
                        className="mt-4 px-6 py-2 bg-transparent border border-white/8 hover:bg-white/5 text-[#F3F4F6] text-xs font-semibold rounded-xl transition-all duration-150 ease-out"
                    >
                        Send Another Message
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                    {status === 'error' && (
                        <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-3">
                            <AlertCircle size={18} className="shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-mono uppercase tracking-[0.15em] text-[#9CA3AF] mb-2">Your Name *</label>
                            <input 
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Jane Doe"
                                className="w-full px-4 py-3 bg-[#090D17] border border-white/5 focus:border-[#06B6D4]/50 focus:ring-1 focus:ring-[#06B6D4]/20 rounded-xl text-[#F3F4F6] placeholder-[#9CA3AF] text-sm outline-none transition-all duration-150 ease-out"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-mono uppercase tracking-[0.15em] text-[#9CA3AF] mb-2">Email Address *</label>
                            <input 
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="jane@company.com"
                                className="w-full px-4 py-3 bg-[#090D17] border border-white/5 focus:border-[#06B6D4]/50 focus:ring-1 focus:ring-[#06B6D4]/20 rounded-xl text-[#F3F4F6] placeholder-[#9CA3AF] text-sm outline-none transition-all duration-150 ease-out"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-mono uppercase tracking-[0.15em] text-[#9CA3AF] mb-2">Subject</label>
                        <select 
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            className="w-full px-4 py-3 bg-[#090D17] border border-white/5 focus:border-[#06B6D4]/50 focus:ring-1 focus:ring-[#06B6D4]/20 rounded-xl text-[#F3F4F6] text-sm outline-none transition-all duration-150 ease-out"
                        >
                            <option value="General Support">General Support & Setup</option>
                            <option value="Bug Report">Bug Report or Issue</option>
                            <option value="Feature Request">Feature Request</option>
                            <option value="Business & Licensing">Business & Licensing Inquiry</option>
                            <option value="Security Vulnerability">Security Disclosure</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-mono uppercase tracking-[0.15em] text-[#9CA3AF] mb-2">Message *</label>
                        <textarea 
                            rows={5}
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            placeholder="Describe your question or issue in detail..."
                            className="w-full px-4 py-3 bg-[#090D17] border border-white/5 focus:border-[#06B6D4]/50 focus:ring-1 focus:ring-[#06B6D4]/20 rounded-xl text-[#F3F4F6] placeholder-[#9CA3AF] text-sm outline-none transition-all duration-150 ease-out resize-none"
                        ></textarea>
                    </div>

                    <button 
                        type="submit"
                        disabled={status === 'submitting'}
                        className="w-full h-12 bg-gradient-to-r from-[#22C55E] to-[#06B6D4] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(6,182,212,0.3)] text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-98 transition-all duration-150 ease-out"
                    >
                        {status === 'submitting' ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Sending Message...
                            </>
                        ) : (
                            <>
                                <Send size={18} />
                                Submit Message
                            </>
                        )}
                    </button>
                </form>
            )}
        </div>
    );
}
