import React from 'react';
import { 
  Monitor, Download, ShieldCheck, Zap, Key, 
  RefreshCw, Cpu, Layers, HelpCircle, Star 
} from 'lucide-react';
import SEOManager from '../../seo/SEOManager';
import Breadcrumbs from '../../components/public/Breadcrumbs';
import { 
  getSoftwareApplicationSchema, 
  getOrganizationSchema, 
  getWebSiteSchema, 
  getFAQPageSchema, 
  getWebPageSchema,
  getBreadcrumbSchema
} from '../../seo/schemaGenerators';
import { KEYWORDS } from '../../seo/seoConfig';

const CLIENT_URL = import.meta.env.VITE_CLIENT_URL || 'http://localhost:5173';

export default function DesktopAgentPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Desktop Agent', item: '/desktop-agent' }
  ]);

  const webPageSchema = getWebPageSchema({
    title: 'Download Chameleon Desktop Agent - Secure Remote Access Software',
    description: 'Download the Chameleon Desktop Agent for high-speed, secure remote desktop and remote PC control. Unattended access, file transfer, and end-to-end encryption.',
    path: '/desktop-agent'
  });

  const appSchema = getSoftwareApplicationSchema({
    version: '1.5.1',
    operatingSystem: 'Windows 10, Windows 11 (64-bit)',
    downloadUrl: 'https://github.com/Rithvik-krishna/Chameleon/releases/download/v1.5.1/Chameleon-Desktop-Agent-Setup-1.5.1.exe',
    fileSize: '68.5 MB'
  });

  const organizationSchema = getOrganizationSchema();
  const websiteSchema = getWebSiteSchema();

  const faqSchema = getFAQPageSchema([
    {
      question: 'What is the Chameleon Desktop Agent?',
      answer: 'The Chameleon Desktop Agent is a secure host application that runs on Windows computers to enable remote screen sharing, file transfer, and mouse/keyboard desktop control directly from any modern web browser.'
    },
    {
      question: 'How does the QR Code Remote Access pairing work?',
      answer: 'The Desktop Agent generates a claim-sync QR code on launch. By scanning this code with the Chameleon web app, your device claims ownership and registers a secure connection room for future unattended access.'
    },
    {
      question: 'Does it support Unattended Access?',
      answer: 'Yes. Once claims are registered, the Chameleon Desktop Agent runs seamlessly in the background, allowing you to establish a secure remote desktop control session at any time.'
    }
  ]);

  const schemas = [
    breadcrumbSchema,
    webPageSchema,
    appSchema,
    organizationSchema,
    websiteSchema,
    faqSchema
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      <SEOManager
        title="Download Chameleon Desktop Agent — Secure Remote Desktop Software"
        description="Download Chameleon Desktop Agent for Windows. Get next-gen unattended remote access, QR-code pairing, and ultra-low latency screen sharing."
        keywords={[...KEYWORDS.primary, 'Chameleon Desktop Agent', 'Chameleon Remote Desktop', 'Chameleon Remote Access', 'Chameleon Remote Desktop Software']}
        canonicalPath="/desktop-agent"
        schemas={schemas}
      />

      <Breadcrumbs items={[{ name: 'Desktop Agent', item: '/desktop-agent' }]} />

      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
          Chameleon Desktop Agent
        </h1>
        <p className="text-base text-slate-400 leading-relaxed">
          Enable secure remote access and unattended desktop control. Run the agent on your host Windows PC, pair instantly, and connect from any device.
        </p>
        <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
          <a
            href="https://github.com/Rithvik-krishna/Chameleon/releases/download/v1.5.1/Chameleon-Desktop-Agent-Setup-1.5.1.exe"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-[0_4px_20px_rgba(6,182,212,0.3)] hover:scale-[1.02]"
          >
            <Download className="w-4 h-4" />
            <span>Download Desktop Agent (v1.5.1)</span>
          </a>
          <a
            href={`${CLIENT_URL}/connect`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/8 hover:bg-white/10 hover:border-white/20 text-white font-bold transition-all hover:scale-[1.02]"
          >
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>Connect to Remote PC</span>
          </a>
        </div>
      </div>

      {/* Core Capabilities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto pt-8">
        <div className="p-6 bg-white/[0.02] border border-white/6 rounded-2xl space-y-4">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl w-fit">
            <Key className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">QR Code Remote Access</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Zero configuration. Scan the QR code displayed on the desktop agent from your client browser to claim and link your system securely in under 3 seconds.
          </p>
        </div>

        <div className="p-6 bg-white/[0.02] border border-white/6 rounded-2xl space-y-4">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl w-fit">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Secure Remote Desktop</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            End-to-end encrypted screen sharing using WebRTC signaling. Screen capture buffer is processed locally without sending readable frame logs to the server.
          </p>
        </div>

        <div className="p-6 bg-white/[0.02] border border-white/6 rounded-2xl space-y-4">
          <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl w-fit">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Unattended Access Mode</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Keeps a persistent background session daemon active so you can control your remote PC from work, home, or on the go, even when logouts occur.
          </p>
        </div>
      </div>

      {/* Installation FAQ Section */}
      <div className="max-w-4xl mx-auto space-y-8 bg-white/[0.01] border border-white/5 rounded-3xl p-8 backdrop-blur-md">
        <h2 className="text-2xl font-bold text-white text-center">Frequently Asked Questions</h2>
        <div className="divide-y divide-white/5 space-y-6">
          <div className="pt-6 first:pt-0 space-y-2">
            <h4 className="font-bold text-slate-200">How do I establish a connection to my host Windows PC?</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Ensure the Chameleon Desktop Agent is running on the target PC. Once claimed, go to the Chameleon Remote Desktop app on your browser, select your claimed PC, and click Connect to trigger real-time screen sharing.
            </p>
          </div>
          <div className="pt-6 space-y-2">
            <h4 className="font-bold text-slate-200">What platforms does the Desktop Agent support?</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Currently, version 1.5.1 of our remote desktop agent is fully optimized as a standalone Windows app. Support for macOS and Linux host agents is currently in active development.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
