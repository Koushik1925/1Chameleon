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
        <nav className={`fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out liquid-glass-nav rounded-full ${
            scrolled 
                ? 'top-3 w-[90%] max-w-6xl h-14 px-5' 
                : 'top-5 w-[94%] max-w-7xl h-16 px-6'
        }`}>
            <div className="w-full h-full flex items-center justify-between">
                
                {/* Brand Logo */}
                <Link to="/" className="flex items-center gap-3 group">
                    <img 
                        src="/logo.png" 
                        alt="Chameleon Logo" 
                        className="w-9 h-9 object-contain drop-shadow-[0_0_14px_rgba(6,182,212,0.45)] group-hover:scale-105 transition-transform duration-300" 
                    />
                    <div className="flex flex-col">
                        <span className="font-extrabold text-lg tracking-tight text-[#F3F4F6] leading-none">chameleon</span>
                        <span className="text-[8.5px] font-extrabold tracking-[1.6px] bg-gradient-to-r from-[#22C55E] via-[#06B6D4] to-[#8B5CF6] bg-clip-text text-transparent uppercase mt-0.5">
                            SEE. CONNECT. CONTROL.
                        </span>
                    </div>
                </Link>

                {/* Desktop Nav Links - Apple Pill Capsules */}
                <div className="hidden md:flex items-center gap-1.5 text-xs font-medium bg-white/5 p-1 rounded-full border border-white/8">
                    <Link 
                        to="/features" 
                        className={`px-4 py-1.5 rounded-full transition-all duration-200 ${
                            location.pathname === '/features' 
                                ? 'text-white bg-white/10 border border-white/12 shadow-sm font-semibold' 
                                : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                        }`}
                    >
                        Features
                    </Link>

                    <Link 
                        to="/downloads" 
                        className={`px-4 py-1.5 rounded-full transition-all duration-200 ${
                            location.pathname === '/downloads' 
                                ? 'text-white bg-white/10 border border-white/12 shadow-sm font-semibold' 
                                : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                        }`}
                    >
                        Downloads
                    </Link>

                    {/* Resources Dropdown */}
                    <div 
                        className="relative"
                        onMouseEnter={() => setResourcesOpen(true)}
                        onMouseLeave={() => setResourcesOpen(false)}
                    >
                        <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[#9CA3AF] hover:text-white hover:bg-white/5 transition-all duration-200">
                            <span>Resources</span>
                            <ChevronDown size={13} className={`transition-transform duration-200 ${resourcesOpen ? 'rotate-180 text-cyan-400' : ''}`} />
                        </button>

                        {resourcesOpen && (
                            <div className="absolute top-full left-0 mt-2 w-52 p-2 liquid-glass-dropdown rounded-2xl animate-in fade-in zoom-in-95 duration-200">
                                <Link to="/help" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-all">
                                    <BookOpen size={15} className="text-cyan-400" />
                                    <span>Help Center</span>
                                </Link>
                                <Link to="/faq" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-all">
                                    <HelpCircle size={15} className="text-cyan-400" />
                                    <span>FAQ</span>
                                </Link>
                                <Link to="/changelog" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-all">
                                    <History size={15} className="text-cyan-400" />
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
                        <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[#9CA3AF] hover:text-white hover:bg-white/5 transition-all duration-200">
                            <span>Legal</span>
                            <ChevronDown size={13} className={`transition-transform duration-200 ${legalOpen ? 'rotate-180 text-cyan-400' : ''}`} />
                        </button>

                        {legalOpen && (
                            <div className="absolute top-full left-0 mt-2 w-56 p-2 liquid-glass-dropdown rounded-2xl animate-in fade-in zoom-in-95 duration-200">
                                <Link to="/privacy" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-all">
                                    <Shield size={15} className="text-emerald-400" />
                                    <span>Privacy Policy</span>
                                </Link>
                                <Link to="/terms" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-all">
                                    <FileText size={15} className="text-cyan-400" />
                                    <span>Terms of Service</span>
                                </Link>
                                <Link to="/cookies" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-all">
                                    <FileText size={15} className="text-blue-400" />
                                    <span>Cookie Policy</span>
                                </Link>
                                <Link to="/security" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-all">
                                    <Lock size={15} className="text-purple-400" />
                                    <span>Security</span>
                                </Link>
                                <div className="h-px bg-white/8 my-1"></div>
                                <Link to="/delete-account" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-all">
                                    <Trash2 size={15} className="text-rose-400" />
                                    <span>Delete Account</span>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Action Buttons - Apple Liquid Glass Style */}
                <div className="hidden md:flex items-center gap-3">
                    {user ? (
                        <>
                            <Link to="/my-devices" className="flex items-center gap-2 text-xs font-medium text-[#F3F4F6] bg-white/5 border border-white/8 hover:bg-white/10 transition-all h-8 px-3.5 rounded-full">
                                {user.profile?.avatar ? (
                                    <img src={user.profile.avatar} alt="Avatar" className="w-4 h-4 rounded-full object-cover border border-[#06B6D4]/50" />
                                ) : (
                                    <User size={14} className="text-cyan-400" />
                                )}
                                <span>{user.profile?.name || user.email}</span>
                            </Link>
                            <Link to="/connect" className="text-xs font-bold text-white liquid-glass-btn-primary h-8 px-4 rounded-full flex items-center">
                                Connect
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="text-xs font-medium text-[#9CA3AF] hover:text-white transition-all h-8 px-3.5 rounded-full flex items-center hover:bg-white/5">
                                Sign In
                            </Link>
                            <Link to="/signup" className="text-xs font-medium text-cyan-300 bg-white/5 border border-white/8 hover:bg-white/10 transition-all h-8 px-3.5 rounded-full flex items-center">
                                Create Account
                            </Link>
                            <Link to="/connect" className="text-xs font-bold text-white liquid-glass-btn-primary h-8 px-4 rounded-full flex items-center">
                                Connect
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile Menu Toggle Button */}
                <button 
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="md:hidden p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                    {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {/* Mobile Drawer - Apple Glass Sheet */}
            {mobileOpen && (
                <div className="md:hidden liquid-glass-dialog p-5 space-y-4 rounded-3xl mt-3 animate-in slide-in-from-top-4 duration-200 mx-auto w-[98%]">
                    <div className="space-y-1">
                        <Link to="/features" className="block px-3 py-2 rounded-xl text-[#F3F4F6] text-sm font-medium hover:bg-white/10">Features</Link>
                        <Link to="/downloads" className="block px-3 py-2 rounded-xl text-[#F3F4F6] text-sm font-medium hover:bg-white/10">Downloads</Link>
                        <Link to="/help" className="block px-3 py-2 rounded-xl text-[#F3F4F6] text-sm font-medium hover:bg-white/10">Help Center</Link>
                        <Link to="/faq" className="block px-3 py-2 rounded-xl text-[#F3F4F6] text-sm font-medium hover:bg-white/10">FAQ</Link>
                        <Link to="/contact" className="block px-3 py-2 rounded-xl text-[#F3F4F6] text-sm font-medium hover:bg-white/10">Contact Support</Link>
                        <Link to="/changelog" className="block px-3 py-2 rounded-xl text-[#F3F4F6] text-sm font-medium hover:bg-white/10">Changelog</Link>
                    </div>

                    <div className="h-px bg-white/8 my-2"></div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-[#9CA3AF] px-2">
                        <Link to="/privacy" className="hover:text-cyan-400">Privacy Policy</Link>
                        <Link to="/terms" className="hover:text-cyan-400">Terms of Service</Link>
                        <Link to="/cookies" className="hover:text-cyan-400">Cookie Policy</Link>
                        <Link to="/security" className="hover:text-cyan-400">Security Overview</Link>
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                        {user ? (
                            <>
                                <Link to="/my-devices" className="w-full text-center py-2.5 liquid-glass-btn-secondary text-white rounded-2xl text-xs font-semibold">My Devices</Link>
                                <Link to="/connect" className="w-full text-center py-2.5 liquid-glass-btn-primary text-white rounded-2xl text-xs font-bold">Connect Now</Link>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="w-full text-center py-2.5 liquid-glass-btn-secondary text-white rounded-2xl text-xs font-semibold">Sign In</Link>
                                <Link to="/connect" className="w-full text-center py-2.5 liquid-glass-btn-primary text-white rounded-2xl text-xs font-bold">Connect Now</Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
