import React from 'react';
import { Sparkles, CheckCircle2, RefreshCw, Zap } from 'lucide-react';
import SEOManager from '../../seo/SEOManager';
import Breadcrumbs from '../../components/public/Breadcrumbs';

export default function ChangelogPage() {
  const releases = [
    {
      version: '1.4.1',
      date: 'August 1, 2026',
      badge: 'Latest Stable',
      changes: [
        'Added enterprise-grade Technical SEO architecture, Open Graph, and JSON-LD schemas.',
        'Optimized WebRTC Adaptive Bitrate Controller (ABR) for smooth 60 FPS video streaming.',
        'Enhanced dual WebRTC DataChannel mouse input coalescing with requestAnimationFrame.',
        'Added Emergency Remote Control Pause shortcut (Cmd/Ctrl + Alt + P).'
      ]
    },
    {
      version: '1.3.0',
      date: 'July 15, 2026',
      changes: [
        'Introduced native Linux AppImage and Debian package releases.',
        'Added stealth administrative session observation mode for audit compliance.',
        'Implemented OS safeStorage hardware identity fingerprinting.'
      ]
    },
    {
      version: '1.2.0',
      date: 'June 20, 2026',
      changes: [
        'Added high-performance off-main-thread Web Worker JPEG frame relay decoder.',
        'Implemented mobile touch gesture engine (double-tap fullscreen, long-press right-click).'
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <SEOManager
        title="Changelog & Version History — Chameleon Remote Desktop"
        description="Track latest Chameleon release updates, performance improvements, bug fixes, and feature additions."
        canonicalPath="/changelog"
      />

      <Breadcrumbs items={[{ name: 'Changelog', item: '/changelog' }]} />

      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight">Changelog & Release Notes</h1>
        <p className="text-sm text-slate-400">
          Stay up to date with new features, speed optimizations, and security updates.
        </p>
      </div>

      <div className="space-y-8 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-800">
        {releases.map((rel, idx) => (
          <div key={idx} className="relative pl-10 space-y-3">
            <div className="absolute left-2 top-1.5 w-4 h-4 rounded-full bg-cyan-500 border-4 border-[#05060b]"></div>
            
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold text-slate-100 font-mono">v{rel.version}</h2>
              <span className="text-xs text-slate-500">{rel.date}</span>
              {rel.badge && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase font-semibold">
                  {rel.badge}
                </span>
              )}
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-2">
              <ul className="space-y-2 text-xs text-slate-300">
                {rel.changes.map((item, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
