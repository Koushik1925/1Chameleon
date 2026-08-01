import React from 'react';
import { Link } from 'react-router-dom';
import { Monitor, Shield, Lock, ExternalLink } from 'lucide-react';

const GithubIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
  </svg>
);

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#030407] border-t border-slate-900 text-slate-400 text-xs py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Monitor className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-base text-slate-100 tracking-tight">Chameleon</span>
            </Link>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              Chameleon is a next-generation, high-performance remote desktop software engineered for ultra-low latency WebRTC streaming, direct peer-to-peer control, end-to-end encryption, and cross-platform flexibility across Windows, macOS, Linux, Android, and iOS.
            </p>
            <div className="flex items-center space-x-3 text-slate-400 text-[11px]">
              <span className="flex items-center space-x-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>All Systems Operational</span>
              </span>
              <span>•</span>
              <span>v1.4.1 Stable</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">Product</h3>
            <ul className="space-y-2">
              <li><Link to="/features" className="hover:text-cyan-400 transition-colors">Features & Tech</Link></li>
              <li><Link to="/download" className="hover:text-cyan-400 transition-colors">Download Apps</Link></li>
              <li><Link to="/security" className="hover:text-cyan-400 transition-colors">Security Whitepaper</Link></li>
              <li><Link to="/changelog" className="hover:text-cyan-400 transition-colors">Release Notes</Link></li>
              <li><a href="https://github.com/Rithvik-krishna/Chameleon" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors flex items-center space-x-1"><span>GitHub Source</span> <ExternalLink className="w-2.5 h-2.5" /></a></li>
            </ul>
          </div>

          {/* Resources Links */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">Resources</h3>
            <ul className="space-y-2">
              <li><Link to="/help" className="hover:text-cyan-400 transition-colors">Help Center & Guides</Link></li>
              <li><Link to="/faq" className="hover:text-cyan-400 transition-colors">Frequently Asked Questions</Link></li>
              <li><Link to="/blog" className="hover:text-cyan-400 transition-colors">Engineering Blog</Link></li>
              <li><Link to="/contact" className="hover:text-cyan-400 transition-colors">Contact Support</Link></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">Legal & Trust</h3>
            <ul className="space-y-2">
              <li><Link to="/privacy" className="hover:text-cyan-400 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-cyan-400 transition-colors">Terms of Service</Link></li>
              <li><Link to="/cookie-policy" className="hover:text-cyan-400 transition-colors">Cookie Policy</Link></li>
              <li><Link to="/delete-account" className="hover:text-cyan-400 transition-colors">Delete Account & Data</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-900/80 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {currentYear} Chameleon Remote Systems Inc. All rights reserved.</p>
          <div className="flex items-center space-x-4">
            <Link to="/privacy" className="hover:text-slate-300">Privacy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-slate-300">Terms</Link>
            <span>•</span>
            <Link to="/security" className="hover:text-slate-300">Security</Link>
            <span>•</span>
            <Link to="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300">XML Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
