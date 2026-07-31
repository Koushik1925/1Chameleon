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
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#0b0f14]/90 backdrop-blur-md border-b border-slate-800/80 py-0 shadow-lg' : 'bg-transparent border-transparent py-2'}`}>
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                
                {/* Brand Logo */}
                <Link to="/" className="flex items-center gap-3 group">
                    <img 
                        src="/logo.png" 
                        alt="Chameleon Logo" 
                        className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.6)] group-hover:scale-105 transition-transform" 
                    />
                    <div className="flex flex-col">
                        <span className="font-extrabold text-xl tracking-tight text-white leading-none">chameleon</span>
                        <span className="text-[9px] font-extrabold tracking-[1.4px] bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent uppercase mt-0.5">
                            SEE. CONNECT. CONTROL.
                        </span>
                    </div>
                </Link>

                {/* Desktop Nav Links */}
                <div className="hidden md:flex items-center gap-1 text-sm font-medium">
                    <Link 
                        to="/features" 
                        className={`px-3.5 py-2 rounded-lg transition-colors ${location.pathname === '/features' ? 'text-cyan-400 bg-cyan-950/30' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                    >
                        Features
                    </Link>

                    <Link 
                        to="/downloads" 
                        className={`px-3.5 py-2 rounded-lg transition-colors ${location.pathname === '/downloads' ? 'text-cyan-400 bg-cyan-950/30' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                    >
                        Downloads
                    </Link>

                    {/* Resources Dropdown */}
                    <div 
                        className="relative"
                        onMouseEnter={() => setResourcesOpen(true)}
                        onMouseLeave={() => setResourcesOpen(false)}
                    >
                        <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                            <span>Resources</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${resourcesOpen ? 'rotate-180 text-cyan-400' : ''}`} />
                        </button>

                        {resourcesOpen && (
                            <div className="absolute top-full left-0 mt-1 w-52 p-2 bg-[#0F172A] border border-slate-800 rounded-xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                                <Link to="/help" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors">
                                    <BookOpen size={16} className="text-cyan-400" />
                                    <span>Help Center</span>
                                </Link>
                                <Link to="/faq" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors">
                                    <HelpCircle size={16} className="text-cyan-400" />
                                    <span>FAQ</span>
                                </Link>
                                <Link to="/changelog" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors">
                                    <History size={16} className="text-cyan-400" />
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
                        <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                            <span>Legal</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${legalOpen ? 'rotate-180 text-cyan-400' : ''}`} />
                        </button>

                        {legalOpen && (
                            <div className="absolute top-full left-0 mt-1 w-56 p-2 bg-[#0F172A] border border-slate-800 rounded-xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                                <Link to="/privacy" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors">
                                    <Shield size={16} className="text-cyan-400" />
                                    <span>Privacy Policy</span>
                                </Link>
                                <Link to="/terms" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors">
                                    <FileText size={16} className="text-cyan-400" />
                                    <span>Terms of Service</span>
                                </Link>
                                <Link to="/cookies" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors">
                                    <FileText size={16} className="text-cyan-400" />
                                    <span>Cookie Policy</span>
                                </Link>
                                <Link to="/security" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors">
                                    <Lock size={16} className="text-cyan-400" />
                                    <span>Security</span>
                                </Link>
                                <div className="h-px bg-slate-800 my-1"></div>
                                <Link to="/delete-account" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors">
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
                            <Link to="/my-devices" className="flex items-center gap-2.5 text-sm font-medium text-slate-200 hover:text-white bg-slate-900/80 border border-slate-800 h-9 px-3.5 rounded-lg hover:border-slate-700 transition-all">
                                {user.profile?.avatar ? (
                                    <img src={user.profile.avatar} alt="Avatar" className="w-5 h-5 rounded-full object-cover border border-cyan-400/40" />
                                ) : (
                                    <User size={16} className="text-cyan-400" />
                                )}
                                <span>{user.profile?.name || user.email}</span>
                            </Link>
                            <Link to="/connect" className="text-sm font-medium text-black bg-cyan-400 hover:bg-cyan-300 transition-colors flex items-center h-9 px-4 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                                Connect
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors h-9 px-4 rounded-lg hover:bg-white/5 flex items-center">
                                Sign In
                            </Link>
                            <Link to="/signup" className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors h-9 px-4 rounded-lg border border-cyan-500/30 bg-cyan-500/10 flex items-center">
                                Create Account
                            </Link>
                            <Link to="/connect" className="text-sm font-medium text-black bg-cyan-400 hover:bg-cyan-300 transition-colors flex items-center h-9 px-4 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.3)]">
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
                <div className="md:hidden bg-[#0F172A]/95 border-b border-slate-800 backdrop-blur-2xl px-6 py-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
                    <div className="space-y-1">
                        <Link to="/features" className="block px-3 py-2.5 rounded-lg text-slate-200 font-medium hover:bg-white/5">Features</Link>
                        <Link to="/downloads" className="block px-3 py-2.5 rounded-lg text-slate-200 font-medium hover:bg-white/5">Downloads</Link>
                        <Link to="/help" className="block px-3 py-2.5 rounded-lg text-slate-200 font-medium hover:bg-white/5">Help Center</Link>
                        <Link to="/faq" className="block px-3 py-2.5 rounded-lg text-slate-200 font-medium hover:bg-white/5">FAQ</Link>
                        <Link to="/contact" className="block px-3 py-2.5 rounded-lg text-slate-200 font-medium hover:bg-white/5">Contact Support</Link>
                        <Link to="/changelog" className="block px-3 py-2.5 rounded-lg text-slate-200 font-medium hover:bg-white/5">Changelog</Link>
                    </div>

                    <div className="h-px bg-slate-800 my-2"></div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 px-3">
                        <Link to="/privacy" className="hover:text-cyan-400">Privacy Policy</Link>
                        <Link to="/terms" className="hover:text-cyan-400">Terms of Service</Link>
                        <Link to="/cookies" className="hover:text-cyan-400">Cookie Policy</Link>
                        <Link to="/security" className="hover:text-cyan-400">Security Overview</Link>
                        <Link to="/delete-account" className="hover:text-red-400 text-red-400/90 col-span-2 mt-1">Delete Account</Link>
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                        {user ? (
                            <>
                                <Link to="/my-devices" className="w-full text-center py-2.5 bg-slate-800 text-white rounded-xl font-medium">My Devices</Link>
                                <Link to="/connect" className="w-full text-center py-2.5 bg-cyan-400 text-black rounded-xl font-bold">Connect Now</Link>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="w-full text-center py-2.5 bg-slate-800 text-white rounded-xl font-medium">Sign In</Link>
                                <Link to="/connect" className="w-full text-center py-2.5 bg-cyan-400 text-black rounded-xl font-bold">Connect Now</Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
