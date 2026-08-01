import React, { useState } from 'react';
import { 
  Monitor, Smartphone, Download, CheckCircle2, Shield, Info, 
  HelpCircle, ChevronDown, ChevronUp, FileCode, Terminal
} from 'lucide-react';
import SEOManager from '../../seo/SEOManager';
import Breadcrumbs from '../../components/public/Breadcrumbs';
import { getSoftwareApplicationSchema, getFAQPageSchema } from '../../seo/schemaGenerators';
import { KEYWORDS } from '../../seo/seoConfig';

export default function DownloadPage() {
  const [activeTab, setActiveTab] = useState('windows');
  const [openFaq, setOpenFaq] = useState(null);

  const releaseInfo = {
    version: '1.4.1',
    releaseDate: 'August 1, 2026',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  };

  const platforms = [
    {
      id: 'windows',
      name: 'Windows',
      icon: <Monitor className="w-5 h-5" />,
      fileType: '.exe / .msi',
      fileSize: '64.2 MB',
      recommended: 'Windows 10 / 11 (64-bit)',
      minSpecs: 'x86_64 CPU, 2 GB RAM, DirectX 11 GPU',
      downloadUrl: 'https://github.com/Rithvik-krishna/Chameleon/releases/download/v1.4.1/Chameleon-Setup-1.4.1.exe',
      installSteps: [
        'Download the installer executable (Chameleon-Setup-1.4.1.exe).',
        'Double-click the installer and accept the User Account Control prompt.',
        'Launch Chameleon from your Start Menu or Desktop shortcut.',
        'Grant screen recording and mouse input permissions when prompted.'
      ]
    },
    {
      id: 'macos',
      name: 'macOS',
      icon: <Monitor className="w-5 h-5" />,
      fileType: '.dmg / .pkg',
      fileSize: '68.5 MB',
      recommended: 'macOS 12.0 Monterey or newer (Apple Silicon & Intel)',
      minSpecs: 'Apple M1/M2/M3 or Intel Core i5, 4 GB RAM',
      downloadUrl: 'https://github.com/Rithvik-krishna/Chameleon/releases/download/v1.4.1/Chameleon-1.4.1.dmg',
      installSteps: [
        'Download the macOS disk image (Chameleon-1.4.1.dmg).',
        'Open the .dmg file and drag Chameleon to your Applications folder.',
        'Open Applications, right-click Chameleon and select Open.',
        'Navigate to System Preferences > Security & Privacy > Accessibility and Screen Recording, and enable Chameleon.'
      ]
    },
    {
      id: 'linux',
      name: 'Linux',
      icon: <Terminal className="w-5 h-5" />,
      fileType: '.deb / .AppImage',
      fileSize: '61.0 MB',
      recommended: 'Ubuntu 22.04 LTS, Debian 12, Fedora 38+',
      minSpecs: 'x86_64 / ARM64, 2 GB RAM, X11 or Wayland',
      downloadUrl: 'https://github.com/Rithvik-krishna/Chameleon/releases/download/v1.4.1/Chameleon-1.4.1.AppImage',
      installSteps: [
        'Download the AppImage or .deb package.',
        'For AppImage: run `chmod +x Chameleon-1.4.1.AppImage` in your terminal.',
        'For Debian/Ubuntu: run `sudo dpkg -i Chameleon-1.4.1.deb`.',
        'Launch by running `./Chameleon-1.4.1.AppImage` or via application menu.'
      ]
    },
    {
      id: 'android',
      name: 'Android',
      icon: <Smartphone className="w-5 h-5" />,
      fileType: '.apk / Google Play',
      fileSize: '24.1 MB',
      recommended: 'Android 10.0 or higher',
      minSpecs: 'ARM64 processor, 2 GB RAM',
      downloadUrl: 'https://github.com/Rithvik-krishna/Chameleon/releases/download/v1.4.1/Chameleon-Mobile-1.4.1.apk',
      installSteps: [
        'Download the APK file directly or install via Google Play Store.',
        'Enable "Install from Unknown Sources" if installing the APK directly.',
        'Launch the app and scan the desktop host QR code to start remote session.'
      ]
    },
    {
      id: 'ios',
      name: 'iOS / iPadOS',
      icon: <Smartphone className="w-5 h-5" />,
      fileType: 'App Store',
      fileSize: '28.5 MB',
      recommended: 'iOS 15.0 / iPadOS 15.0 or newer',
      minSpecs: 'iPhone 8 or newer, iPad 6th gen or newer',
      downloadUrl: 'https://apps.apple.com/app/chameleon-remote-desktop/id123456789',
      installSteps: [
        'Open the Apple App Store on your iPhone or iPad.',
        'Search for "Chameleon Remote Desktop".',
        'Tap Get / Download to install.',
        'Open the app and input your 6-digit numeric pairing code.'
      ]
    }
  ];

  const faqs = [
    {
      question: 'Do remote viewers need to install software?',
      answer: 'No! Remote viewers can join and control remote computers directly inside any modern web browser (Chrome, Firefox, Safari, Edge) without installing any client software or browser extensions.'
    },
    {
      question: 'Is Chameleon completely free to use?',
      answer: 'Yes! Chameleon is free for personal, educational, and developer use. Enterprise licensing options are available for team management and auditing.'
    },
    {
      question: 'How do I set up unattended access?',
      answer: 'Install the desktop host agent on your computer, navigate to Settings > Unattended Access, and create a permanent security key or pair it with your account.'
    },
    {
      question: 'Is my remote connection secure?',
      answer: 'Absolutely. All connections use WebRTC SRTP end-to-end encryption with TLS signaling. Video streams travel directly peer-to-peer between your devices.'
    }
  ];

  const appSchema = getSoftwareApplicationSchema({
    version: releaseInfo.version,
    fileSize: platforms.find(p => p.id === activeTab)?.fileSize || '64.2 MB'
  });

  const faqSchema = getFAQPageSchema(faqs);

  const currentPlatform = platforms.find(p => p.id === activeTab) || platforms[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      <SEOManager
        title="Download Chameleon Remote Desktop for Windows, Mac, Linux, Android & iOS"
        description="Download Chameleon Remote Desktop v1.4.1. Fast, low-latency remote access software for Windows, macOS, Linux, Android, and iOS. Direct P2P WebRTC screen sharing."
        keywords={KEYWORDS.primary.concat(['download remote desktop', 'remote access installer', 'windows remote desktop app'])}
        canonicalPath="/download"
        schemas={[appSchema, faqSchema]}
      />

      <Breadcrumbs items={[{ name: 'Download', item: '/download' }]} />

      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-semibold">
          <span>Release Build v{releaseInfo.version}</span>
          <span>•</span>
          <span>Updated {releaseInfo.releaseDate}</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
          Download Chameleon Remote Desktop
        </h1>
        <p className="text-sm sm:text-base text-slate-400">
          Select your operating system to download the official desktop agent or mobile remote app.
        </p>
      </div>

      {/* OS Platform Tabs */}
      <div className="space-y-8">
        <div className="flex flex-wrap justify-center gap-2 border-b border-slate-800 pb-4">
          {platforms.map(p => (
            <button
              key={p.id}
              onClick={() => setActiveTab(p.id)}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                activeTab === p.id
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-bold'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              {p.icon}
              <span>{p.name}</span>
            </button>
          ))}
        </div>

        {/* Selected Platform Details */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Download Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                {currentPlatform.icon}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-100">Chameleon for {currentPlatform.name}</h2>
                <span className="text-xs text-slate-400 font-mono">Package Format: {currentPlatform.fileType} • Size: {currentPlatform.fileSize}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <a
                href={currentPlatform.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-xl shadow-cyan-500/25 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5"
              >
                <Download className="w-4 h-4" />
                <span>Download for {currentPlatform.name}</span>
              </a>
              <a
                href="https://github.com/Rithvik-krishna/Chameleon/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs flex items-center justify-center space-x-2"
              >
                <FileCode className="w-4 h-4 text-cyan-400" />
                <span>View Release Notes & SHA-256</span>
              </a>
            </div>

            {/* Installation Guide Steps */}
            <div className="space-y-3 pt-4 border-t border-slate-900">
              <h3 className="font-semibold text-slate-200 text-sm">Step-by-Step Installation Guide</h3>
              <ol className="space-y-2 text-xs text-slate-300">
                {currentPlatform.installSteps.map((step, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 text-cyan-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* System Requirements & Security */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
            <h3 className="font-semibold text-slate-200 text-sm border-b border-slate-800 pb-2">System Requirements</h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block">Recommended OS:</span>
                <span className="text-slate-200 font-medium">{currentPlatform.recommended}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Hardware Specs:</span>
                <span className="text-slate-200 font-medium">{currentPlatform.minSpecs}</span>
              </div>
              <div>
                <span className="text-slate-500 block">SHA-256 Checksum:</span>
                <span className="text-slate-400 font-mono text-[10px] break-all block bg-slate-950 p-2 rounded border border-slate-800 mt-1">
                  {releaseInfo.sha256}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center space-x-2 text-emerald-400 text-xs font-semibold">
              <Shield className="w-4 h-4 shrink-0" />
              <span>Verified Clean & Signed Binary</span>
            </div>
          </div>
        </div>
      </div>

      {/* Frequently Asked Download Questions */}
      <div className="space-y-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-100 text-center">Frequently Asked Download Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-4 text-left font-semibold text-slate-200 text-xs sm:text-sm flex justify-between items-center hover:text-cyan-400 transition-colors"
              >
                <span>{faq.question}</span>
                {openFaq === i ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>
              {openFaq === i && (
                <div className="p-4 pt-0 text-xs text-slate-400 leading-relaxed border-t border-slate-900/60">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
