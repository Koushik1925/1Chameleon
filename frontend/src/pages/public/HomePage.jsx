import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Monitor, Shield, Zap, Cpu, Smartphone, Lock, RefreshCw, Download, 
  ArrowRight, CheckCircle2, XCircle, Star, Sparkles, Globe, Layers
} from 'lucide-react';
import SEOManager from '../../seo/SEOManager';
import { 
  getSoftwareApplicationSchema, 
  getOrganizationSchema, 
  getWebSiteSchema 
} from '../../seo/schemaGenerators';
import { KEYWORDS } from '../../seo/seoConfig';

export default function HomePage() {
  const schemas = [
    getSoftwareApplicationSchema(),
    getOrganizationSchema(),
    getWebSiteSchema()
  ];

  return (
    <div className="space-y-24 py-8 md:py-16">
      <SEOManager
        title="Chameleon — Secure Ultra-Low Latency Remote Desktop Software"
        description="Fast, secure cross-platform remote desktop software. Sub-100ms latency WebRTC screen sharing, remote PC control, file transfer, and unattended access for Windows, macOS, Linux, Android, and iOS."
        keywords={[...KEYWORDS.primary, ...KEYWORDS.secondary, ...KEYWORDS.longTail]}
        canonicalPath="/"
        schemas={schemas}
      />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Next-Gen WebRTC P2P Architecture</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-100 max-w-5xl mx-auto leading-tight">
          Secure, Sub-100ms <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 bg-clip-text text-transparent">
            Remote Desktop Software
          </span>
        </h1>

        <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
          Instantly control your remote PC, Mac, Linux server, or mobile device from any browser. Built with hardware-accelerated H.264 video encoding and end-to-end encryption. The ultimate TeamViewer and AnyDesk alternative.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/download"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" />
            <span>Download Chameleon Free</span>
          </Link>
          <Link
            to="/features"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-sm flex items-center justify-center space-x-2 transition-all"
          >
            <span>Explore Features</span>
            <ArrowRight className="w-4 h-4 text-cyan-400" />
          </Link>
        </div>

        {/* Quick Platform Badges */}
        <div className="pt-8 flex flex-wrap justify-center items-center gap-6 text-xs font-medium text-slate-400">
          <span className="flex items-center space-x-1.5"><Monitor className="w-4 h-4 text-cyan-400" /> <span>Windows</span></span>
          <span>•</span>
          <span className="flex items-center space-x-1.5"><Monitor className="w-4 h-4 text-cyan-400" /> <span>macOS</span></span>
          <span>•</span>
          <span className="flex items-center space-x-1.5"><Monitor className="w-4 h-4 text-cyan-400" /> <span>Linux</span></span>
          <span>•</span>
          <span className="flex items-center space-x-1.5"><Smartphone className="w-4 h-4 text-cyan-400" /> <span>Android & iOS</span></span>
        </div>
      </section>

      {/* Product Interactive Demo Card */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-1 space-y-4 text-left">
              <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-widest">Instant P2P Pairing</span>
              <h2 className="text-2xl font-bold text-slate-100">No Installation Needed for Viewers</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect in seconds using 6-digit numeric hardware codes or instant QR pairing. Stream ultra-smooth 60 FPS remote sessions right inside your browser.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" /> <span>Sub-100ms Glass-to-Glass Latency</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" /> <span>Zero Browser Extensions Required</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" /> <span>Dual WebRTC DataChannels</span></li>
              </ul>
            </div>

            <div className="lg:col-span-2 bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-4 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-mono text-slate-400 ml-2">chameleon://session/connect</span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">CONNECTED 60 FPS</span>
              </div>
              <div className="h-56 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center space-y-3 p-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-semibold text-slate-200 block">End-to-End Encrypted Session Active</span>
                  <span className="text-xs text-slate-400 font-mono">Pairing ID: 849-204 • WebRTC SRTP Direct UDP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core SEO Feature Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold text-slate-100 tracking-tight">Built for Professionals, IT & Remote Teams</h2>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Everything you need in high-speed remote access software without expensive licensing models or latency bottlenecks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 hover:border-cyan-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-100">Ultra-Low Latency Streaming</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              GPU DXGI desktop capture and NVENC/Intel QuickSync encoding deliver silky smooth 60 FPS remote desktop access over standard internet connections.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 hover:border-cyan-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-100">Enterprise End-to-End Encryption</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Peer-to-peer media streams are secured using WebRTC SRTP over UDP with TLS signaling. Zero third-party video storage or interception.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 hover:border-cyan-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <Globe className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-100">Cross-Platform Control</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Seamlessly access Windows, macOS, and Linux PCs from desktop apps or mobile phones (Android & iPhone). Includes file transfer and clipboard synchronization.
            </p>
          </div>
        </div>
      </section>

      {/* Competitor Comparison Matrix (TeamViewer / AnyDesk / RustDesk) */}
      <section className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono text-cyan-400 uppercase font-bold tracking-widest">Why Choose Chameleon</span>
          <h2 className="text-3xl font-bold text-slate-100">Chameleon vs. Other Remote Desktop Tools</h2>
          <p className="text-xs text-slate-400">See how Chameleon compares against TeamViewer, AnyDesk, and RustDesk.</p>
        </div>

        <div className="overflow-x-auto bg-slate-950/70 border border-slate-800 rounded-2xl shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase text-[10px] font-semibold">
                <th className="p-4">Feature / Protocol</th>
                <th className="p-4 text-cyan-400 font-bold text-xs">Chameleon</th>
                <th className="p-4">TeamViewer</th>
                <th className="p-4">AnyDesk</th>
                <th className="p-4">RustDesk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr>
                <td className="p-4 font-semibold text-slate-200">Glass-to-Glass Latency</td>
                <td className="p-4 font-bold text-emerald-400">&lt; 100ms (WebRTC P2P)</td>
                <td className="p-4 text-slate-400">150-250ms</td>
                <td className="p-4 text-slate-400">120-200ms</td>
                <td className="p-4 text-slate-400">100-180ms</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-200">Zero-Install Web Viewer</td>
                <td className="p-4"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></td>
                <td className="p-4"><XCircle className="w-4 h-4 text-slate-600" /></td>
                <td className="p-4"><XCircle className="w-4 h-4 text-slate-600" /></td>
                <td className="p-4"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-200">GPU HW Acceleration (NVENC)</td>
                <td className="p-4"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></td>
                <td className="p-4"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></td>
                <td className="p-4"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></td>
                <td className="p-4"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-200">Dual WebRTC DataChannels</td>
                <td className="p-4"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></td>
                <td className="p-4"><XCircle className="w-4 h-4 text-slate-600" /></td>
                <td className="p-4"><XCircle className="w-4 h-4 text-slate-600" /></td>
                <td className="p-4"><XCircle className="w-4 h-4 text-slate-600" /></td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-200">Unattended Access</td>
                <td className="p-4"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></td>
                <td className="p-4"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></td>
                <td className="p-4"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></td>
                <td className="p-4"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="max-w-5xl mx-auto px-4 text-center">
        <div className="bg-gradient-to-r from-cyan-950/40 via-blue-950/40 to-slate-950/40 border border-cyan-500/30 rounded-3xl p-8 sm:p-12 space-y-6">
          <h2 className="text-3xl font-bold text-slate-100">Ready for Fast, Secure Remote Desktop Access?</h2>
          <p className="text-xs text-slate-300 max-w-xl mx-auto">
            Download the desktop host agent for Windows, Mac, or Linux, or connect directly through your browser.
          </p>
          <Link
            to="/download"
            className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Download Chameleon Now</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
