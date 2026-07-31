import { Link } from 'react-router-dom';
import { Settings, Shield, Github, Heart } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-[#070B11] border-t border-slate-800/80 pt-16 pb-12 text-slate-400 text-sm">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
                    
                    {/* Brand Column */}
                    <div className="col-span-2 space-y-4">
                        <Link to="/" className="inline-flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                                <Settings className="text-black" size={18} />
                            </div>
                            <span className="font-bold text-lg text-white tracking-wide">Chameleon</span>
                        </Link>
                        <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
                            Ultra-low latency, zero-configuration remote desktop software built with modern WebRTC peer-to-peer end-to-end encryption.
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                            <a 
                                href="https://github.com/Rithvik-krishna/Chameleon" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
                            >
                                <Github size={18} />
                            </a>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 text-xs font-mono">
                                <Shield size={12} />
                                DTLS-SRTP 256-bit
                            </div>
                        </div>
                    </div>

                    {/* Product Links */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-white tracking-wide text-xs uppercase text-slate-300">Product</h4>
                        <ul className="space-y-2">
                            <li><Link to="/features" className="hover:text-cyan-400 transition-colors">Features</Link></li>
                            <li><Link to="/downloads" className="hover:text-cyan-400 transition-colors">Downloads</Link></li>
                            <li><Link to="/help" className="hover:text-cyan-400 transition-colors">Help Center</Link></li>
                            <li><Link to="/faq" className="hover:text-cyan-400 transition-colors">FAQ</Link></li>
                        </ul>
                    </div>

                    {/* Company & Resources Links */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-white tracking-wide text-xs uppercase text-slate-300">Company</h4>
                        <ul className="space-y-2">
                            <li><Link to="/contact" className="hover:text-cyan-400 transition-colors">Contact Support</Link></li>
                            <li><a href="https://github.com/Rithvik-krishna/Chameleon" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">GitHub Repository</a></li>
                            <li className="pt-2"><h4 className="font-semibold text-white tracking-wide text-xs uppercase text-slate-300">Resources</h4></li>
                            <li><Link to="/changelog" className="hover:text-cyan-400 transition-colors">Changelog</Link></li>
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-white tracking-wide text-xs uppercase text-slate-300">Legal</h4>
                        <ul className="space-y-2">
                            <li><Link to="/privacy" className="hover:text-cyan-400 transition-colors">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="hover:text-cyan-400 transition-colors">Terms of Service</Link></li>
                            <li><Link to="/cookies" className="hover:text-cyan-400 transition-colors">Cookie Policy</Link></li>
                            <li><Link to="/security" className="hover:text-cyan-400 transition-colors">Security Overview</Link></li>
                            <li><Link to="/delete-account" className="text-red-400/90 hover:text-red-300 transition-colors">Delete Account</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Copyright Bar */}
                <div className="pt-8 border-t border-slate-800/60 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                    <p>© 2026 Chameleon. All Rights Reserved.</p>
                    <p className="flex items-center gap-1">
                        Engineered for High-Performance Remote Control
                    </p>
                </div>
            </div>
        </footer>
    );
}
