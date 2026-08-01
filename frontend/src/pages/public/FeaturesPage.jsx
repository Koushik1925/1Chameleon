import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, Shield, Cpu, Monitor, Smartphone, RefreshCw, FileText, 
  Copy, Eye, Lock, Layers, Download, CheckCircle, ArrowRight 
} from 'lucide-react';
import SEOManager from '../../seo/SEOManager';
import Breadcrumbs from '../../components/public/Breadcrumbs';
import { getWebPageSchema } from '../../seo/schemaGenerators';
import { KEYWORDS } from '../../seo/seoConfig';

export default function FeaturesPage() {
  const pageSchema = getWebPageSchema({
    title: 'Chameleon Remote Desktop Features & Architecture',
    description: 'Explore Chameleon features: ultra-low latency WebRTC remote control, GPU accelerated H.264 video streaming, file transfer, clipboard sync, and multi-platform support.',
    path: '/features'
  });

  const featureList = [
    {
      icon: <Zap className="w-6 h-6 text-cyan-400" />,
      title: 'Sub-100ms Glass-to-Glass Latency',
      description: 'Leveraging WebRTC media transport over UDP, direct peer-to-peer streaming delivers instant responsiveness for smooth remote desktop access without annoying lag.'
    },
    {
      icon: <Cpu className="w-6 h-6 text-blue-400" />,
      title: 'GPU DXGI & NVENC Hardware Encoding',
      description: 'The Electron desktop agent uses native GPU acceleration (NVIDIA NVENC, Intel QuickSync) for high-framerate H.264 video capture with minimal CPU load.'
    },
    {
      icon: <Layers className="w-6 h-6 text-indigo-400" />,
      title: 'Dual WebRTC DataChannels',
      description: 'Separates mouse movement (unreliable/unordered UDP for zero cursor lag) from keyboard keystrokes and clicks (reliable/ordered for guaranteed delivery).'
    },
    {
      icon: <Lock className="w-6 h-6 text-emerald-400" />,
      title: 'Hardware-Derived Identity & Pairing',
      description: 'Permanent 6-digit numeric pairing codes and QR codes generated from hardware motherboard serial numbers ensure secure, instant authentication.'
    },
    {
      icon: <Copy className="w-6 h-6 text-amber-400" />,
      title: 'Cross-Platform Clipboard & File Sync',
      description: 'Instantly copy text, code snippets, or transferring files between remote Windows, macOS, Linux, and mobile devices effortlessly.'
    },
    {
      icon: <Smartphone className="w-6 h-6 text-rose-400" />,
      title: 'Mobile Touch & Gesture Controls',
      description: 'Full touch-optimized control for Android and iOS devices including double-tap fullscreen, long-press right-click, pinch-to-zoom, and virtual hotkeys.'
    },
    {
      icon: <Eye className="w-6 h-6 text-purple-400" />,
      title: 'Stealth & Administrative Monitoring',
      description: 'Built-in support for security teams and IT admins to observe active remote support sessions for auditing and quality control.'
    },
    {
      icon: <RefreshCw className="w-6 h-6 text-cyan-400" />,
      title: 'Adaptive Bitrate Engine (ABR)',
      description: 'GCC-inspired bandwidth controller automatically scales stream resolution (from 360p20 up to 1080p60) based on packet loss and round-trip latency.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      <SEOManager
        title="Remote Desktop Features — Low Latency P2P Screen Sharing"
        description="Comprehensive list of Chameleon features: WebRTC P2P remote control, GPU hardware encoding, multi-platform support, file transfer, clipboard sync, and security."
        keywords={KEYWORDS.secondary}
        canonicalPath="/features"
        schemas={[pageSchema]}
      />

      <Breadcrumbs items={[{ name: 'Features', item: '/features' }]} />

      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
          Next-Generation Remote Access <br />
          <span className="text-cyan-400">Engineering & Features</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          Chameleon is built from the ground up for high-throughput, low-latency remote computer management, support, and collaboration.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {featureList.map((item, idx) => (
          <div key={idx} className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 space-y-3 hover:border-cyan-500/40 transition-colors flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                {item.icon}
              </div>
              <h2 className="text-base font-bold text-slate-200">{item.title}</h2>
              <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Technical Spec Box */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-8 space-y-6">
        <div className="space-y-2">
          <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-widest">Protocol Architecture</span>
          <h2 className="text-2xl font-bold text-slate-100">Under the Hood Architecture</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-2">
            <span className="font-semibold text-cyan-400 block text-sm">Media Transport</span>
            <p className="text-slate-400">WebRTC SRTP over UDP with direct peer-to-peer NAT traversal. Automatic fallback to Socket.IO frame relay if symmetric NAT is encountered.</p>
          </div>
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-2">
            <span className="font-semibold text-blue-400 block text-sm">Input Injection</span>
            <p className="text-slate-400">Native C++ OS input injection using nut.js on desktop hosts, maintaining hardware keyboard layouts and multi-monitor setups.</p>
          </div>
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-2">
            <span className="font-semibold text-indigo-400 block text-sm">Render Engine</span>
            <p className="text-slate-400">Off-main-thread Web Workers with OffscreenCanvas and createImageBitmap zero-copy GPU decoding for non-blocking UI rendering.</p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="text-center pt-8">
        <Link
          to="/download"
          className="inline-flex items-center space-x-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20"
        >
          <Download className="w-4 h-4" />
          <span>Download Chameleon Software</span>
        </Link>
      </div>
    </div>
  );
}
