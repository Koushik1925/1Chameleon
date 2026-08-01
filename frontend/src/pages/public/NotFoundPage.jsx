import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home, Search, Download } from 'lucide-react';
import SEOManager from '../../seo/SEOManager';

export default function NotFoundPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-8">
      <SEOManager
        title="404 Page Not Found — Chameleon Remote Desktop"
        description="The requested page could not be found."
        noIndex={true}
      />

      <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
        <AlertCircle className="w-8 h-8" />
      </div>

      <div className="space-y-3">
        <span className="text-xs font-mono text-rose-400 font-bold uppercase tracking-widest">Error 404</span>
        <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight">Page Not Found</h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          The page you are looking for might have been moved, renamed, or does not exist.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link
          to="/"
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Return Home</span>
        </Link>
        <Link
          to="/download"
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center space-x-2"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Download Apps</span>
        </Link>
      </div>
    </div>
  );
}
