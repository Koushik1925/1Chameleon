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
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-6">Send Us a Message</h3>

            {status === 'success' ? (
                <div className="p-6 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-center space-y-3 animate-in fade-in duration-300">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                        <CheckCircle2 size={24} />
                    </div>
                    <h4 className="text-xl font-bold text-white">Message Received!</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">
                        Thank you for reaching out to Chameleon Support. Our engineering team will review your inquiry and respond within 24 hours.
                    </p>
                    <button 
                        onClick={() => setStatus('idle')}
                        className="mt-4 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl transition-colors"
                    >
                        Send Another Message
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                    {status === 'error' && (
                        <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-3">
                            <AlertCircle size={18} className="shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Your Name *</label>
                            <input 
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Jane Doe"
                                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl text-white text-sm outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Email Address *</label>
                            <input 
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="jane@company.com"
                                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl text-white text-sm outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Subject</label>
                        <select 
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl text-white text-sm outline-none transition-colors"
                        >
                            <option value="General Support">General Support & Setup</option>
                            <option value="Bug Report">Bug Report or Issue</option>
                            <option value="Feature Request">Feature Request</option>
                            <option value="Business & Licensing">Business & Licensing Inquiry</option>
                            <option value="Security Vulnerability">Security Disclosure</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Message *</label>
                        <textarea 
                            rows={5}
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            placeholder="Describe your question or issue in detail..."
                            className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl text-white text-sm outline-none transition-colors resize-none"
                        ></textarea>
                    </div>

                    <button 
                        type="submit"
                        disabled={status === 'submitting'}
                        className="w-full h-12 bg-cyan-400 hover:bg-cyan-300 text-black font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
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
