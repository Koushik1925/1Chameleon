import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Monitor, Menu, X, Download, ArrowRight } from 'lucide-react';

const GithubIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
  </svg>
);

export default function PublicNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Features', path: '/features' },
    { name: 'Download', path: '/download' },
    { name: 'Help Center', path: '/help' },
    { name: 'FAQ', path: '/faq' },
    { name: 'Blog', path: '/blog' },
    { name: 'Security', path: '/security' },
    { name: 'Privacy', path: '/privacy' },
    { name: 'Contact', path: '/contact' }
  ];

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-3 z-50 max-w-7xl mx-auto px-4">
      <nav aria-label="Main Navigation" className="liquid-glass-nav rounded-full h-15 px-5 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-2.5 group" aria-label="Chameleon Remote Desktop Home">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-purple-600 flex items-center justify-center shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Monitor className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base text-slate-100 tracking-tight leading-none group-hover:text-cyan-400 transition-colors">
              Chameleon
            </span>
            <span className="text-[9px] text-cyan-400 font-mono tracking-wider font-semibold uppercase mt-0.5">
              Remote Desktop
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-1 bg-black/20 p-1 rounded-full border border-white/5 backdrop-blur-md">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                isActive(link.path)
                  ? 'text-white bg-white/12 border border-white/15 shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-white/6'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Actions CTA */}
        <div className="hidden md:flex items-center space-x-2.5">
          <a
            href="https://github.com/Rithvik-krishna/Chameleon"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View Chameleon source code on GitHub"
            className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <GithubIcon className="w-4 h-4" />
          </a>
          
          <Link
            to="/login"
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-200 liquid-glass-btn-secondary"
          >
            Admin Panel
          </Link>

          <Link
            to="/download"
            className="px-4 py-1.5 rounded-full text-xs font-bold text-white liquid-glass-btn-primary flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </Link>
        </div>

        {/* Mobile Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
          className="lg:hidden p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden liquid-glass-dialog rounded-3xl p-5 space-y-3 mt-2 animate-in slide-in-from-top-4 duration-200">
          <div className="grid grid-cols-2 gap-1.5">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive(link.path)
                    ? 'text-cyan-400 bg-white/10 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-white/8 flex flex-col space-y-2">
            <Link
              to="/download"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 rounded-2xl text-xs font-bold liquid-glass-btn-primary text-white text-center flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Chameleon</span>
            </Link>
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2 text-xs font-medium text-slate-400 text-center hover:text-white"
            >
              Admin Dashboard Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
