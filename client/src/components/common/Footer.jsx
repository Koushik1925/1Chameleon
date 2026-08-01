import { Link } from 'react-router-dom';
import { Settings, Shield, Heart } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-[#0D1320] border-t border-white/5 pt-16 pb-12 text-[#9CA3AF] text-sm">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
                    
                    {/* Brand Column */}
                    <div className="col-span-2 space-y-4">
                        <Link to="/" className="inline-flex items-center gap-3 group">
                            <img 
                                src="/logo.png" 
                                alt="Chameleon Logo" 
                                className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-transform" 
                            />
                            <div className="flex flex-col">
                                <span className="font-extrabold text-xl tracking-tight text-[#F3F4F6] leading-none">chameleon</span>
                                <span className="text-[9px] font-extrabold tracking-[1.4px] bg-gradient-to-r from-[#22C55E] via-[#06B6D4] to-[#8B5CF6] bg-clip-text text-transparent uppercase mt-0.5">
                                    SEE. CONNECT. CONTROL.
                                </span>
                            </div>
                        </Link>
                        <p className="text-[#9CA3AF] text-sm max-w-sm leading-relaxed">
                            Ultra-low latency, zero-configuration remote desktop software built with modern WebRTC peer-to-peer end-to-end encryption.
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#090D17] border border-white/5 text-[#06B6D4] text-xs font-mono">
                                <Shield size={12} />
                                DTLS-SRTP 256-bit
                            </div>
                        </div>
                    </div>

                    {/* Product Links */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-[#F3F4F6] tracking-wider text-xs uppercase">Product</h4>
                        <ul className="space-y-2">
                            <li><Link to="/features" className="hover:text-[#06B6D4] transition-all duration-150 ease-out">Features</Link></li>
                            <li><Link to="/downloads" className="hover:text-[#06B6D4] transition-all duration-150 ease-out">Downloads</Link></li>
                            <li><Link to="/changelog" className="hover:text-[#06B6D4] transition-all duration-150 ease-out">Changelog</Link></li>
                            <li><Link to="/security" className="hover:text-[#06B6D4] transition-all duration-150 ease-out">Security</Link></li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-[#F3F4F6] tracking-wider text-xs uppercase">Resources</h4>
                        <ul className="space-y-2">
                            <li><Link to="/help" className="hover:text-[#06B6D4] transition-all duration-150 ease-out">Help Center</Link></li>
                            <li><Link to="/faq" className="hover:text-[#06B6D4] transition-all duration-150 ease-out">FAQ</Link></li>
                            <li><Link to="/contact" className="hover:text-[#06B6D4] transition-all duration-150 ease-out">Contact Support</Link></li>
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-[#F3F4F6] tracking-wider text-xs uppercase">Legal</h4>
                        <ul className="space-y-2">
                            <li><Link to="/privacy" className="hover:text-[#06B6D4] transition-all duration-150 ease-out">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="hover:text-[#06B6D4] transition-all duration-150 ease-out">Terms of Service</Link></li>
                            <li><Link to="/cookies" className="hover:text-[#06B6D4] transition-all duration-150 ease-out">Cookie Policy</Link></li>
                            <li><Link to="/delete-account" className="hover:text-red-400 text-red-400/80 hover:text-red-450 transition-all duration-150 ease-out">Delete Account</Link></li>
                        </ul>
                    </div>

                </div>

                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#9CA3AF]">
                    <div>Chameleon Agent © {new Date().getFullYear()}</div>
                    <div className="flex items-center gap-1 text-[#9CA3AF]">
                        <span>Engineered with</span>
                        <Heart size={12} className="text-red-500 fill-red-500" />
                        <span>for high performance remote control</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
