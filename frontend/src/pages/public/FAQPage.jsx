import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, HelpCircle } from 'lucide-react';
import SEOManager from '../../seo/SEOManager';
import Breadcrumbs from '../../components/public/Breadcrumbs';
import { getFAQPageSchema } from '../../seo/schemaGenerators';

export default function FAQPage() {
  const [openIdx, setOpenIdx] = useState(0);
  const [query, setQuery] = useState('');

  const faqs = [
    {
      category: 'General',
      question: 'What is Chameleon Remote Desktop?',
      answer: 'Chameleon is a secure, ultra-low latency remote desktop application that allows you to access and control your computer or server remotely from any device or modern web browser.'
    },
    {
      category: 'General',
      question: 'How does Chameleon compare to TeamViewer and AnyDesk?',
      answer: 'Chameleon utilizes direct WebRTC peer-to-peer streaming with hardware GPU acceleration (DXGI & NVENC), achieving sub-100ms latency. Remote viewers can connect directly from a browser without installing software.'
    },
    {
      category: 'Security',
      question: 'How is remote desktop traffic encrypted?',
      answer: 'All audio, video, and input data channels are encrypted end-to-end using WebRTC SRTP (Secure Real-time Transport Protocol) with AES-256 and TLS 1.3 signaling.'
    },
    {
      category: 'Security',
      question: 'What is the Emergency Remote Control Pause shortcut?',
      answer: 'Pressing Cmd/Ctrl + Alt + P on the desktop host agent immediately locks and pauses all incoming mouse and keyboard remote injection for security.'
    },
    {
      category: 'Performance',
      question: 'What frame rates and resolutions are supported?',
      answer: 'Chameleon supports up to 1080p 60 FPS streaming on high-speed connections. The Adaptive Bitrate Controller (ABR) dynamically steps down resolution during network congestion to maintain smooth interaction.'
    },
    {
      category: 'Platforms',
      question: 'Which operating systems are supported?',
      answer: 'The host desktop agent supports Windows 10/11, macOS (Intel & Apple Silicon), and Linux (Ubuntu, Debian, Fedora). Viewers can connect from any web browser or our native Android and iOS apps.'
    }
  ];

  const filteredFaqs = faqs.filter(f => 
    f.question.toLowerCase().includes(query.toLowerCase()) || 
    f.answer.toLowerCase().includes(query.toLowerCase())
  );

  const faqSchema = getFAQPageSchema(faqs);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <SEOManager
        title="Frequently Asked Questions (FAQ) — Chameleon Remote Desktop"
        description="Find answers to common questions about Chameleon remote desktop performance, security, pricing, WebRTC connection pairing, and platform compatibility."
        keywords={['remote desktop faq', 'chameleon questions', 'teamviewer alternative faq', 'webrtc security']}
        canonicalPath="/faq"
        schemas={[faqSchema]}
      />

      <Breadcrumbs items={[{ name: 'FAQ', item: '/faq' }]} />

      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-sm text-slate-400">
          Everything you need to know about Chameleon remote access, security, and setup.
        </p>

        {/* Search Bar */}
        <div className="relative max-w-lg mx-auto pt-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-4" />
          <input
            type="text"
            placeholder="Search questions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-3">
        {filteredFaqs.map((faq, idx) => (
          <div key={idx} className="bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden transition-all">
            <button
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              className="w-full p-5 text-left font-semibold text-slate-200 text-xs sm:text-sm flex justify-between items-center hover:text-cyan-400 transition-colors"
            >
              <span className="flex items-center space-x-2">
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded font-bold uppercase">{faq.category}</span>
                <span>{faq.question}</span>
              </span>
              {openIdx === idx ? <ChevronUp className="w-4 h-4 text-cyan-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
            </button>
            {openIdx === idx && (
              <div className="p-5 pt-0 text-xs text-slate-400 leading-relaxed border-t border-slate-900/80">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
