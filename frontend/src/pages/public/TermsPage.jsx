import React from 'react';
import SEOManager from '../../seo/SEOManager';
import Breadcrumbs from '../../components/public/Breadcrumbs';

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <SEOManager
        title="Terms of Service — Chameleon Remote Desktop"
        description="Chameleon Terms of Service agreement governing the acceptable use of remote access software, licensing terms, and liability limits."
        canonicalPath="/terms"
      />

      <Breadcrumbs items={[{ name: 'Terms of Service', item: '/terms' }]} />

      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">Terms of Service</h1>
        <p className="text-xs text-slate-500">Effective Date: August 1, 2026</p>
      </div>

      <div className="prose prose-invert max-w-none text-slate-300 text-xs sm:text-sm leading-relaxed space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-100">1. Acceptance of Terms</h2>
          <p>
            By downloading, installing, or accessing the Chameleon application, website, or services, you agree to be bound by these Terms of Service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-100">2. Acceptable Use Policy</h2>
          <p>
            You agree not to use Chameleon for unauthorized remote computer access, malicious activity, spreading malware, or circumventing system access controls on machines you do not own or have explicit authorization to manage.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-100">3. Software License</h2>
          <p>
            Chameleon grants you a non-exclusive, non-transferable license to use the remote desktop application for personal or authorized business remote control.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-100">4. Limitation of Liability</h2>
          <p>
            Chameleon Remote Systems Inc. is provided "as is" without warranty of any kind. Under no circumstances will Chameleon be liable for indirect or consequential damages.
          </p>
        </section>
      </div>
    </div>
  );
}
