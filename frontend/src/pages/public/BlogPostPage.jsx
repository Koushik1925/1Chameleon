import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { BLOG_POSTS } from './BlogPage';
import { Calendar, User, Clock, ArrowLeft, Share2, CheckCircle2 } from 'lucide-react';
import SEOManager from '../../seo/SEOManager';
import Breadcrumbs from '../../components/public/Breadcrumbs';
import { getBlogPostingSchema } from '../../seo/schemaGenerators';
import { SITE_CONFIG } from '../../seo/seoConfig';

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = BLOG_POSTS.find(p => p.slug === slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const postUrl = `${SITE_CONFIG.domain}/blog/${post.slug}`;
  const blogSchema = getBlogPostingSchema({
    title: post.title,
    description: post.description,
    url: postUrl,
    datePublished: '2026-08-01',
    authorName: post.author
  });

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <SEOManager
        title={post.title}
        description={post.description}
        keywords={post.keywords}
        canonicalPath={`/blog/${post.slug}`}
        ogType="article"
        schemas={[blogSchema]}
      />

      <Breadcrumbs items={[
        { name: 'Blog', item: '/blog' },
        { name: post.title, item: `/blog/${post.slug}` }
      ]} />

      <Link to="/blog" className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Blog Index</span>
      </Link>

      {/* Post Header */}
      <div className="space-y-4 border-b border-slate-900 pb-8">
        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono font-bold text-[10px] uppercase">
            {post.category}
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1"><Calendar className="w-3.5 h-3.5" /> <span>{post.date}</span></span>
          <span>•</span>
          <span className="flex items-center space-x-1"><Clock className="w-3.5 h-3.5" /> <span>{post.readTime}</span></span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight leading-tight">
          {post.title}
        </h1>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
          <span className="flex items-center space-x-1.5 text-slate-300 font-medium">
            <User className="w-4 h-4 text-cyan-400" />
            <span>By {post.author}</span>
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed space-y-6">
        <p className="text-base text-slate-200 font-medium leading-relaxed">
          {post.description}
        </p>

        <h2 className="text-2xl font-bold text-slate-100 pt-4">Introduction to High Performance Remote Desktop</h2>
        <p>
          Remote desktop access has traditionally been limited by video compression latency, CPU overhead, and cumbersome client software installations. Proprietary tools like TeamViewer and AnyDesk frequently enforce strict commercial blocks or require heavy background daemons.
        </p>
        <p>
          Chameleon changes this paradigm by utilizing direct WebRTC peer-to-peer transport over UDP combined with hardware-derived 6-digit numeric pairing codes and GPU DXGI desktop capture.
        </p>

        <h2 className="text-2xl font-bold text-slate-100 pt-4">Key Technical Advantages</h2>
        <ul className="space-y-2 list-none pl-0">
          <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" /> <span>Zero Client Install for Viewers (Runs in any browser)</span></li>
          <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" /> <span>GPU Accelerated H.264 Video Encoding (NVENC & Intel QuickSync)</span></li>
          <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" /> <span>Dual WebRTC DataChannels separating mouse and keyboard events</span></li>
          <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" /> <span>AES-256 SRTP end-to-end encrypted video and data transport</span></li>
        </ul>

        <h2 className="text-2xl font-bold text-slate-100 pt-4">Conclusion</h2>
        <p>
          Whether you are managing a fleet of Linux servers or providing remote IT support to non-technical users, Chameleon offers an open, fast, and enterprise-grade remote desktop solution.
        </p>
      </div>

      {/* Footer CTA */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 text-center space-y-3 pt-6">
        <h3 className="text-lg font-bold text-slate-100">Experience Sub-100ms Remote Desktop Control</h3>
        <p className="text-xs text-slate-400">Download Chameleon host agent for Windows, macOS, and Linux today.</p>
        <Link
          to="/download"
          className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors"
        >
          <span>Download Free</span>
        </Link>
      </div>
    </article>
  );
}
