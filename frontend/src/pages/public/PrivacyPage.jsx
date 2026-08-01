import React from 'react';
import SEOManager from '../../seo/SEOManager';
import Breadcrumbs from '../../components/public/Breadcrumbs';

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <SEOManager
        title="Privacy Policy — Chameleon Remote Desktop"
        description="Chameleon Privacy Policy detailing data collection, peer-to-peer WebRTC streaming privacy, telemetry policies, and GDPR / CCPA compliance."
        canonicalPath="/privacy"
      />

      <Breadcrumbs items={[{ name: 'Privacy Policy', item: '/privacy' }]} />

      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">Privacy Policy</h1>
        <p className="text-xs text-slate-500">Effective Date: August 1, 2026</p>
      </div>

      <div className="prose prose-invert max-w-none text-slate-300 text-xs sm:text-sm leading-relaxed space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-100">1. Information We Collect</h2>
          <p>
            Chameleon is designed with privacy as a foundational principle. We collect minimal operational data necessary to perform peer-to-peer WebRTC signaling and device pairing:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li><strong>Hardware Fingerprints:</strong> SHA-256 hashed identifiers derived from machine GUIDs for pairing authentication.</li>
            <li><strong>Session Telemetry:</strong> Anonymized connection metrics (latency, FPS, resolution) to ensure quality of service.</li>
            <li><strong>Signaling Metadata:</strong> Ephemeral IP addresses and SDP/ICE candidates required to establish peer connections.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-100">2. Zero Video Recording Policy</h2>
          <p>
            Chameleon does NOT record, store, or intercept your remote desktop screen stream. All video, audio, mouse, and keyboard events flow directly peer-to-peer between host and viewer via WebRTC SRTP encryption.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-100">3. Third-Party Sharing & Disclosure</h2>
          <p>
            We do not sell, rent, or monetize your personal or device data under any circumstances. Data is only processed to provide remote desktop access.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-100">4. Your Rights (GDPR & CCPA)</h2>
          <p>
            You have the right to request deletion of your account and device telemetry at any time by visiting our <a href="/delete-account" className="text-cyan-400 underline">Delete Account & Data Erasure Page</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
