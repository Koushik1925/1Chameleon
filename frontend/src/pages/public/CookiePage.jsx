import React from 'react';
import SEOManager from '../../seo/SEOManager';
import Breadcrumbs from '../../components/public/Breadcrumbs';

export default function CookiePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <SEOManager
        title="Cookie Policy — Chameleon Remote Desktop"
        description="Learn how Chameleon uses essential local storage and minimal cookies to maintain remote desktop web application state."
        canonicalPath="/cookie-policy"
      />

      <Breadcrumbs items={[{ name: 'Cookie Policy', item: '/cookie-policy' }]} />

      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">Cookie Policy</h1>
        <p className="text-xs text-slate-500">Effective Date: August 1, 2026</p>
      </div>

      <div className="prose prose-invert max-w-none text-slate-300 text-xs sm:text-sm leading-relaxed space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-100">1. How We Use Cookies</h2>
          <p>
            Chameleon uses minimal local storage and essential session cookies strictly for authentication and maintaining web viewer session state.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-100">2. Types of Cookies Used</h2>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li><strong>Strictly Necessary:</strong> Maintains JWT admin tokens and WebRTC session credentials in browser localStorage.</li>
            <li><strong>Analytics Cookies:</strong> Optional Google Analytics and Microsoft Clarity performance monitoring cookies.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-100">3. Managing Cookies</h2>
          <p>
            You can disable cookies in your browser settings at any time; however, logging into the admin panel requires localStorage enabled.
          </p>
        </section>
      </div>
    </div>
  );
}
