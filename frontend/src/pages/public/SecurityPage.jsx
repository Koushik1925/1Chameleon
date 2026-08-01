import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Key, Cpu, EyeOff, FileText, CheckCircle2, Download } from 'lucide-react';
import SEOManager from '../../seo/SEOManager';
import Breadcrumbs from '../../components/public/Breadcrumbs';
import { getWebPageSchema } from '../../seo/schemaGenerators';
import { KEYWORDS } from '../../seo/seoConfig';

export default function SecurityPage() {
  const pageSchema = getWebPageSchema({
    title: 'Security Whitepaper & Infrastructure — Chameleon Remote Desktop',
    description: 'Learn about Chameleon zero-trust security model: AES-256 WebRTC SRTP encryption, hardware fingerprint authentication, and emergency pause safety controls.',
    path: '/security'
  });

  const securityFeatures = [
    {
      icon: <Lock className="w-6 h-6 text-cyan-400" />,
      title: 'End-to-End WebRTC SRTP Encryption',
      description: 'All audio, video, and remote input data are protected with AES-256 encryption. Video packets travel directly peer-to-peer without being recorded or stored on central servers.'
    },
    {
      icon: <Key className="w-6 h-6 text-blue-400" />,
      title: 'Hardware-Derived Identity Authentication',
      description: 'Chameleon generates permanent 6-digit pairing keys bound to hardware MachineGuid and motherboard serial numbers, eliminating spoofing and credential theft.'
    },
    {
      icon: <EyeOff className="w-6 h-6 text-indigo-400" />,
      title: 'Emergency Remote Control Pause',
      description: 'Global hotkey Cmd/Ctrl + Alt + P immediately blocks all incoming mouse and keyboard injection, giving local users total control over their session at any instant.'
    },
    {
      icon: <Shield className="w-6 h-6 text-emerald-400" />,
      title: 'OS Keychain Key Protection',
      description: 'Desktop agents store session keys and tokens using Electron safeStorage APIs backed by OS keychains (Windows DPAPI, macOS Keychain, Linux Secret Service).'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      <SEOManager
        title="Security Whitepaper & End-to-End Encryption — Chameleon"
        description="Comprehensive overview of Chameleon zero-trust security architecture, WebRTC SRTP end-to-end encryption, hardware identity, and compliance standards."
        keywords={KEYWORDS.secondary.concat(['secure remote desktop', 'remote access security', 'end to end encrypted remote desktop'])}
        canonicalPath="/security"
        schemas={[pageSchema]}
      />

      <Breadcrumbs items={[{ name: 'Security', item: '/security' }]} />

      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold">
          <Shield className="w-3.5 h-3.5" />
          <span>Zero-Trust Remote Architecture</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
          Enterprise Security & Privacy
        </h1>
        <p className="text-sm sm:text-base text-slate-400">
          Chameleon is engineered with a privacy-first, zero-trust model designed to keep your remote sessions completely private and secure.
        </p>
      </div>

      {/* Security Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {securityFeatures.map((sec, idx) => (
          <div key={idx} className="bg-slate-950/60 border border-slate-800/80 rounded-3xl p-8 space-y-4 hover:border-emerald-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
              {sec.icon}
            </div>
            <h2 className="text-xl font-bold text-slate-100">{sec.title}</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{sec.description}</p>
          </div>
        ))}
      </div>

      {/* Security Specs Table */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-8 space-y-6">
        <h2 className="text-2xl font-bold text-slate-100">Security Specifications Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-2">
            <span className="font-semibold text-slate-200 block text-sm">Transport Layer</span>
            <span className="text-slate-400">WebRTC SRTP over UDP, TLS 1.3 Signaling, WSS WebSocket connections</span>
          </div>
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-2">
            <span className="font-semibold text-slate-200 block text-sm">Data Encryption</span>
            <span className="text-slate-400">AES-GCM-256 for media streams, ECDSA / RSA-2048 key exchange</span>
          </div>
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-2">
            <span className="font-semibold text-slate-200 block text-sm">Access Control</span>
            <span className="text-slate-400">6-digit pairing pin, QR codes, hardware machine GUID validation, device ban registry</span>
          </div>
        </div>
      </div>

      {/* CTA Download */}
      <div className="text-center">
        <Link
          to="/download"
          className="inline-flex items-center space-x-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20"
        >
          <Download className="w-4 h-4" />
          <span>Download Secure Remote Agent</span>
        </Link>
      </div>
    </div>
  );
}
