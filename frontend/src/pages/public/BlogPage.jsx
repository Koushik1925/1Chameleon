import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, Clock, ArrowRight, BookOpen } from 'lucide-react';
import SEOManager from '../../seo/SEOManager';
import Breadcrumbs from '../../components/public/Breadcrumbs';
import { getWebPageSchema } from '../../seo/schemaGenerators';

export const BLOG_POSTS = [
  {
    slug: 'ultra-low-latency-webrtc-remote-desktop',
    title: 'Achieving Sub-100ms Latency with WebRTC & GPU Hardware Acceleration',
    description: 'How Chameleon leverages WebRTC SRTP media streams, DXGI desktop capture, and NVENC H.264 encoding for glass-to-glass remote desktop performance.',
    date: 'August 1, 2026',
    author: 'Chameleon Core Engine Team',
    readTime: '6 min read',
    category: 'Engineering',
    keywords: ['low latency remote desktop', 'webrtc screen sharing', 'nvenc hardware encoding']
  },
  {
    slug: 'teamviewer-vs-anydesk-vs-chameleon',
    title: 'Why Chameleon is the Best Free TeamViewer & AnyDesk Alternative in 2026',
    description: 'A detailed feature, pricing, and latency comparison between legacy remote control software and Chameleon P2P WebRTC architecture.',
    date: 'July 25, 2026',
    author: 'SEO & Product Architecture Team',
    readTime: '8 min read',
    category: 'Comparisons',
    keywords: ['best TeamViewer alternative', 'best AnyDesk alternative', 'remote desktop software']
  },
  {
    slug: 'how-to-setup-unattended-access-linux',
    title: 'How to Set Up Unattended Access on Linux Servers & Desktops',
    description: 'Step-by-step guide to installing the Chameleon background daemon service on Ubuntu, Debian, and Fedora for 24/7 remote access.',
    date: 'July 18, 2026',
    author: 'Linux Systems Specialist',
    readTime: '5 min read',
    category: 'Guides',
    keywords: ['unattended remote access', 'remote desktop for linux', 'ubuntu remote desktop']
  },
  {
    slug: 'zero-trust-end-to-end-encryption-remote-support',
    title: 'Zero-Trust Remote Support: End-to-End Encryption Architecture',
    description: 'An architectural deep dive into how hardware fingerprints, WebRTC SRTP encryption, and Emergency Control Pause protect enterprise IT infrastructure.',
    date: 'July 10, 2026',
    author: 'Security & Compliance Team',
    readTime: '7 min read',
    category: 'Security',
    keywords: ['secure remote desktop', 'end to end encryption', 'remote access security']
  }
];

export default function BlogPage() {
  const pageSchema = getWebPageSchema({
    title: 'Chameleon Engineering Blog & Remote Desktop Guides',
    description: 'Articles, tutorials, tech comparisons, and security insights on high-performance remote desktop technology.',
    path: '/blog'
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <SEOManager
        title="Engineering Blog — Chameleon Remote Desktop Insights"
        description="Read technical deep dives on WebRTC latency optimization, TeamViewer alternatives, unattended Linux remote access, and zero-trust security."
        keywords={['remote desktop blog', 'TeamViewer alternative article', 'webrtc engineering', 'remote access guide']}
        canonicalPath="/blog"
        schemas={[pageSchema]}
      />

      <Breadcrumbs items={[{ name: 'Blog', item: '/blog' }]} />

      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight">
          Chameleon Engineering & Insights
        </h1>
        <p className="text-sm text-slate-400">
          Technical deep dives into WebRTC streaming, latency reduction, security, and remote work tools.
        </p>
      </div>

      {/* Posts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {BLOG_POSTS.map((post) => (
          <article
            key={post.slug}
            className="bg-slate-950/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-4 hover:border-cyan-500/40 transition-all flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono font-bold text-[10px] uppercase">
                  {post.category}
                </span>
                <span className="flex items-center space-x-1"><Clock className="w-3.5 h-3.5" /> <span>{post.readTime}</span></span>
              </div>
              <h2 className="text-xl font-bold text-slate-100 group-hover:text-cyan-400 transition-colors leading-snug">
                <Link to={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">{post.description}</p>
            </div>

            <div className="pt-4 border-t border-slate-900 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">{post.date}</span>
              <Link
                to={`/blog/${post.slug}`}
                className="text-cyan-400 font-semibold flex items-center space-x-1 hover:underline"
              >
                <span>Read Article</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
