import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, HelpCircle, Shield, Wifi, Terminal, MessageSquare, ArrowRight } from 'lucide-react';
import SEOManager from '../../seo/SEOManager';
import Breadcrumbs from '../../components/public/Breadcrumbs';
import { getWebPageSchema } from '../../seo/schemaGenerators';

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const articles = [
    {
      category: 'Getting Started',
      icon: <BookOpen className="w-5 h-5 text-cyan-400" />,
      title: 'Quickstart Guide: Pairing Your First Computer',
      description: 'Learn how to generate a 6-digit pairing code on the host machine and initiate a remote desktop session from any browser.',
      link: '/help'
    },
    {
      category: 'Network & WebRTC',
      icon: <Wifi className="w-5 h-5 text-blue-400" />,
      title: 'Troubleshooting NAT & Firewall Connections',
      description: 'How Chameleon traverses symmetric NATs using WebRTC ICE candidates and automatic Socket.IO frame relay fallback.',
      link: '/help'
    },
    {
      category: 'Security & Keys',
      icon: <Shield className="w-5 h-5 text-indigo-400" />,
      title: 'Emergency Remote Pause Shortcut (Ctrl+Alt+P)',
      description: 'Use the global emergency shortcut to instantly pause native keyboard and mouse input injection during active sessions.',
      link: '/help'
    },
    {
      category: 'Unattended Access',
      icon: <Terminal className="w-5 h-5 text-emerald-400" />,
      title: 'Setting Up Unattended Access on Windows & Linux',
      description: 'Configure persistent startup services and silent background host agents for remote server maintenance.',
      link: '/help'
    }
  ];

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pageSchema = getWebPageSchema({
    title: 'Chameleon Help Center & Documentation',
    description: 'Documentation, quickstart guides, and troubleshooting for Chameleon remote desktop software.',
    path: '/help'
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <SEOManager
        title="Help Center & User Documentation — Chameleon Remote Desktop"
        description="Comprehensive guides, troubleshooting steps, network configuration, and setup tutorials for Chameleon remote desktop."
        keywords={['remote desktop help', 'remote access support', 'webrtc troubleshooting', 'chameleon guide']}
        canonicalPath="/help"
        schemas={[pageSchema]}
      />

      <Breadcrumbs items={[{ name: 'Help Center', item: '/help' }]} />

      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
          How can we help you?
        </h1>
        <p className="text-sm sm:text-base text-slate-400">
          Search our knowledge base for setup guides, WebRTC network troubleshooting, and keyboard shortcuts.
        </p>

        {/* Search Bar */}
        <div className="relative max-w-xl mx-auto pt-2">
          <Search className="w-5 h-5 text-slate-500 absolute left-4 top-5" />
          <input
            type="text"
            placeholder="Search articles, setup steps, keyboard shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl pl-12 pr-4 py-3.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-cyan-500 shadow-xl"
          />
        </div>
      </div>

      {/* Knowledge Base Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredArticles.map((art, idx) => (
          <div key={idx} className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 space-y-3 hover:border-cyan-500/40 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                {art.icon}
              </div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">{art.category}</span>
            </div>
            <h2 className="text-base font-bold text-slate-200">{art.title}</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{art.description}</p>
          </div>
        ))}
      </div>

      {/* Support Callout */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Need personalized technical support?</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Our technical support team is available for custom deployment assistance and enterprise integration.
        </p>
        <Link
          to="/contact"
          className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Contact Technical Support</span>
        </Link>
      </div>
    </div>
  );
}
