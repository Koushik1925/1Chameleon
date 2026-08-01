import { Link } from 'react-router-dom';
import { Shield, Heart } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="pt-16 pb-12 text-[#9CA3AF] text-sm relative z-20 bg-transparent">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
                    
                    {/* Brand Column */}
                    <div className="col-span-2 space-y-4">
                        <Link to="/" className="inline-flex items-center gap-3 group">
                            <img 
                                src="/logo.png" 
                                alt="Chameleon Logo" 
                                className="w-10 h-10 object-contain drop-shadow-[0_0_14px_rgba(6,182,212,0.45)] group-hover:scale-105 transition-transform duration-300" 
                            />
                            <div className="flex flex-col">
                                <span className="font-extrabold text-xl tracking-tight text-[#F3F4F6] leading-none">chameleon</span>
                                <span className="text-[9px] font-extrabold tracking-[1.6px] bg-gradient-to-r from-[#22C55E] via-[#06B6D4] to-[#8B5CF6] bg-clip-text text-transparent uppercase mt-0.5">
                                    SEE. CONNECT. CONTROL.
                                </span>
                            </div>
                        </Link>
                        <p className="text-[#9CA3AF] text-xs leading-relaxed max-w-sm">
                            Ultra-low latency, zero-configuration remote desktop application built with modern WebRTC peer-to-peer end-to-end encryption.
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full liquid-glass-badge text-[#06B6D4] text-[10px] font-mono">
                                <Shield size={12} className="text-emerald-400" />
                                DTLS-SRTP 256-bit P2P
                            </div>
                        </div>
                    </div>

                    {/* Product Links */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-[#F3F4F6] tracking-wider text-[11px] uppercase font-mono">Product</h4>
                        <ul className="space-y-2 text-xs">
                            <li><Link to="/features" className="hover:text-cyan-400 transition-colors">Features</Link></li>
                            <li><Link to="/downloads" className="hover:text-cyan-400 transition-colors">Downloads</Link></li>
                            <li><Link to="/changelog" className="hover:text-cyan-400 transition-colors">Changelog</Link></li>
                            <li><Link to="/security" className="hover:text-cyan-400 transition-colors">Security</Link></li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-[#F3F4F6] tracking-wider text-[11px] uppercase font-mono">Resources</h4>
                        <ul className="space-y-2 text-xs">
                            <li><Link to="/help" className="hover:text-cyan-400 transition-colors">Help Center</Link></li>
                            <li><Link to="/faq" className="hover:text-cyan-400 transition-colors">FAQ</Link></li>
                            <li><Link to="/contact" className="hover:text-cyan-400 transition-colors">Contact Support</Link></li>
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-[#F3F4F6] tracking-wider text-[11px] uppercase font-mono">Legal</h4>
                        <ul className="space-y-2 text-xs">
                            <li><Link to="/privacy" className="hover:text-cyan-400 transition-colors">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="hover:text-cyan-400 transition-colors">Terms of Service</Link></li>
                            <li><Link to="/cookies" className="hover:text-cyan-400 transition-colors">Cookie Policy</Link></li>
                            <li><Link to="/delete-account" className="text-rose-400/90 hover:text-rose-300 transition-colors">Delete Account</Link></li>
                        </ul>
                    </div>

                </div>

                <div className="border-t border-white/8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#9CA3AF]">
                    <div>Chameleon Agent © {new Date().getFullYear()}</div>
                    <div className="flex items-center gap-1.5 text-[#9CA3AF]">
                        <span>Engineered with</span>
                        <Heart size={12} className="text-rose-500 fill-rose-500" />
                        <span>for high-performance remote control</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
