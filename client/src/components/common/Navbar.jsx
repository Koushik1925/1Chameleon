import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
    Settings, ChevronDown, Menu, X, User, HelpCircle, 
    BookOpen, History, Shield, FileText, Lock, Trash2, 
    Download, Zap, LogIn 
} from 'lucide-react';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [resourcesOpen, setResourcesOpen] = useState(false);
    const [legalOpen, setLegalOpen] = useState(false);

    const location = useLocation();

    const [user] = useState(() => {
        try {
            const saved = localStorage.getItem('chameleon_user');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close dropdowns on route change
    useEffect(() => {
        setMobileOpen(false);
        setResourcesOpen(false);
        setLegalOpen(false);
    }, [location.pathname]);

    return (
        <nav className={`fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-200 ease-out ${
            scrolled 
                ? 'top-2 w-[92%] bg-[#090D17]/72 backdrop-blur-[24px] border border-white/5 rounded-[18px] shadow-[0_12px_40px_rgba(0,0,0,0.45)] h-14' 
                : 'top-4 w-[95%] bg-[#090D17]/72 backdrop-blur-[24px] border border-white/5 rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.35)] h-16'
        }`}>
            <div className="w-full h-full px-6 flex items-center justify-between">
                
                {/* Brand Logo */}
                <Link to="/" className="flex items-center gap-3 group">
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

                {/* Desktop Nav Links */}
                <div className="hidden md:flex items-center gap-1 text-sm font-medium">
                    <Link 
                        to="/features" 
                        className={`px-3.5 py-2 rounded-lg transition-all duration-150 ease-out ${location.pathname === '/features' ? 'text-[#06B6D4] bg-white/5 font-semibold' : 'text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-white/5'}`}
                    >
                        Features
                    </Link>

                    <Link 
                        to="/downloads" 
                        className={`px-3.5 py-2 rounded-lg transition-all duration-150 ease-out ${location.pathname === '/downloads' ? 'text-[#06B6D4] bg-white/5 font-semibold' : 'text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-white/5'}`}
                    >
                        Downloads
                    </Link>

                    {/* Resources Dropdown */}
                    <div 
                        className="relative"
                        onMouseEnter={() => setResourcesOpen(true)}
                        onMouseLeave={() => setResourcesOpen(false)}
                    >
                        <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-white/5 transition-all duration-150 ease-out">
                            <span>Resources</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${resourcesOpen ? 'rotate-180 text-[#06B6D4]' : ''}`} />
                        </button>

                        {resourcesOpen && (
                            <div className="absolute top-full left-0 mt-1 w-52 p-2 bg-[#090D17]/95 border border-white/5 rounded-xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                                <Link to="/help" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-white/5 transition-all duration-150 ease-out">
                                    <BookOpen size={16} className="text-[#06B6D4]" />
                                    <span>Help Center</span>
                                </Link>
                                <Link to="/faq" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-white/5 transition-all duration-150 ease-out">
                                    <HelpCircle size={16} className="text-[#06B6D4]" />
                                    <span>FAQ</span>
                                </Link>
                                <Link to="/changelog" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-white/5 transition-all duration-150 ease-out">
                                    <History size={16} className="text-[#06B6D4]" />
                                    <span>Changelog</span>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Legal Dropdown */}
                    <div 
                        className="relative"
                        onMouseEnter={() => setLegalOpen(true)}
                        onMouseLeave={() => setLegalOpen(false)}
                    >
                        <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-white/5 transition-all duration-150 ease-out">
                            <span>Legal</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${legalOpen ? 'rotate-180 text-[#06B6D4]' : ''}`} />
                        </button>

                        {legalOpen && (
                            <div className="absolute top-full left-0 mt-1 w-56 p-2 bg-[#090D17]/95 border border-white/5 rounded-xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                                <Link to="/privacy" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-white/5 transition-all duration-150 ease-out">
                                    <Shield size={16} className="text-[#06B6D4]" />
                                    <span>Privacy Policy</span>
                                </Link>
                                <Link to="/terms" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-white/5 transition-all duration-150 ease-out">
                                    <FileText size={16} className="text-[#06B6D4]" />
                                    <span>Terms of Service</span>
                                </Link>
                                <Link to="/cookies" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-white/5 transition-all duration-150 ease-out">
                                    <FileText size={16} className="text-[#06B6D4]" />
                                    <span>Cookie Policy</span>
                                </Link>
                                <Link to="/security" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-white/5 transition-all duration-150 ease-out">
                                    <Lock size={16} className="text-[#06B6D4]" />
                                    <span>Security</span>
                                </Link>
                                <div className="h-px bg-white/5 my-1"></div>
                                <Link to="/delete-account" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all duration-150 ease-out">
                                    <Trash2 size={16} className="text-red-400" />
                                    <span>Delete Account</span>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Action Buttons */}
                <div className="hidden md:flex items-center gap-3">
                    {user ? (
                        <>
                            <Link to="/my-devices" className="flex items-center gap-2.5 text-sm font-medium text-[#F3F4F6] hover:text-white bg-transparent border border-white/8 h-9 px-3.5 rounded-xl hover:bg-white/5 transition-all duration-150 ease-out">
                                {user.profile?.avatar ? (
                                    <img src={user.profile.avatar} alt="Avatar" className="w-5 h-5 rounded-full object-cover border border-[#06B6D4]/40" />
                                ) : (
                                    <User size={16} className="text-[#06B6D4]" />
                                )}
                                <span>{user.profile?.name || user.email}</span>
                            </Link>
                            <Link to="/connect" className="text-sm font-semibold text-white bg-gradient-to-r from-[#22C55E] to-[#06B6D4] hover:scale-[1.02] hover:opacity-95 active:scale-98 transition-all duration-150 ease-out flex items-center h-9 px-4 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                                Connect
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="text-sm font-medium text-[#9CA3AF] hover:text-white transition-all duration-150 ease-out h-9 px-4 rounded-xl hover:bg-white/5 flex items-center">
                                Sign In
                            </Link>
                            <Link to="/signup" className="text-sm font-medium text-[#06B6D4] hover:text-cyan-300 transition-all duration-150 ease-out h-9 px-4 rounded-xl border border-white/8 bg-transparent hover:bg-white/5 flex items-center">
                                Create Account
                            </Link>
                            <Link to="/connect" className="text-sm font-semibold text-white bg-gradient-to-r from-[#22C55E] to-[#06B6D4] hover:scale-[1.02] hover:opacity-95 active:scale-98 transition-all duration-150 ease-out flex items-center h-9 px-4 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                                Connect
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile Menu Toggle Button */}
                <button 
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                    {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Drawer */}
            {mobileOpen && (
                <div className="md:hidden bg-[#090D17]/95 border border-white/5 backdrop-blur-2xl px-6 py-6 space-y-4 rounded-2xl shadow-2xl mt-2 animate-in slide-in-from-top-4 duration-200 mx-auto w-[98%]">
                    <div className="space-y-1">
                        <Link to="/features" className="block px-3 py-2.5 rounded-lg text-[#F3F4F6] font-medium hover:bg-white/5">Features</Link>
                        <Link to="/downloads" className="block px-3 py-2.5 rounded-lg text-[#F3F4F6] font-medium hover:bg-white/5">Downloads</Link>
                        <Link to="/help" className="block px-3 py-2.5 rounded-lg text-[#F3F4F6] font-medium hover:bg-white/5">Help Center</Link>
                        <Link to="/faq" className="block px-3 py-2.5 rounded-lg text-[#F3F4F6] font-medium hover:bg-white/5">FAQ</Link>
                        <Link to="/contact" className="block px-3 py-2.5 rounded-lg text-[#F3F4F6] font-medium hover:bg-white/5">Contact Support</Link>
                        <Link to="/changelog" className="block px-3 py-2.5 rounded-lg text-[#F3F4F6] font-medium hover:bg-white/5">Changelog</Link>
                    </div>

                    <div className="h-px bg-white/5 my-2"></div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-[#9CA3AF] px-3">
                        <Link to="/privacy" className="hover:text-cyan-400">Privacy Policy</Link>
                        <Link to="/terms" className="hover:text-cyan-400">Terms of Service</Link>
                        <Link to="/cookies" className="hover:text-cyan-400">Cookie Policy</Link>
                        <Link to="/security" className="hover:text-cyan-400">Security Overview</Link>
                        <Link to="/delete-account" className="hover:text-red-400 text-red-400/90 col-span-2 mt-1">Delete Account</Link>
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                        {user ? (
                            <>
                                <Link to="/my-devices" className="w-full text-center py-2.5 bg-[#111827] text-white rounded-xl font-medium border border-white/5">My Devices</Link>
                                <Link to="/connect" className="w-full text-center py-2.5 bg-gradient-to-r from-[#22C55E] to-[#06B6D4] text-white rounded-xl font-bold shadow-md">Connect Now</Link>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="w-full text-center py-2.5 bg-[#111827] text-white rounded-xl font-medium border border-white/5">Sign In</Link>
                                <Link to="/connect" className="w-full text-center py-2.5 bg-gradient-to-r from-[#22C55E] to-[#06B6D4] text-white rounded-xl font-bold shadow-md">Connect Now</Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
