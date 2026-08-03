import React from 'react';
import { CheckCircle, Shield, Sparkles, Zap, Star, ShieldCheck } from 'lucide-react';
import SEOManager from '../../seo/SEOManager';
import Breadcrumbs from '../../components/public/Breadcrumbs';
import { getWebPageSchema } from '../../seo/schemaGenerators';
import { KEYWORDS } from '../../seo/seoConfig';

const CLIENT_URL = import.meta.env.VITE_CLIENT_URL || 'http://localhost:5173';

export default function PricingPage() {
  const pageSchema = getWebPageSchema({
    title: 'Chameleon Pro Subscription & Pricing Plans',
    description: 'Choose the best subscription plan for Chameleon Pro: Monthly, Quarterly, Half-Yearly, and Yearly intervals. High-speed low-latency remote desktop streaming.',
    path: '/pricing'
  });

  const features = [
    'Unlimited Remote Sessions',
    'High-Speed Remote Desktop',
    'Unlimited File Transfer',
    'Clipboard Synchronization',
    'Multi Monitor Support',
    'Remote Terminal',
    'Wake-on-LAN',
    'Priority Support',
    'Future Feature Updates',
    'End-to-End Encryption'
  ];

  const plans = [
    {
      id: 'MONTHLY',
      name: 'Monthly',
      price: '₹999',
      period: '30 Days',
      badge: 'Starter',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
      cta: 'Upgrade',
      popular: false
    },
    {
      id: 'QUARTERLY',
      name: 'Quarterly',
      price: '₹2,499',
      period: '90 Days',
      badge: 'Most Popular',
      badgeColor: 'bg-cyan-950/50 text-cyan-400 border-cyan-500/30',
      cta: 'Get Started',
      popular: true
    },
    {
      id: 'HALF_YEARLY',
      name: 'Half-Yearly',
      price: '₹4,499',
      period: '180 Days',
      badge: 'Best Value',
      badgeColor: 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30',
      cta: 'Get Started',
      popular: false
    },
    {
      id: 'YEARLY',
      name: 'Yearly',
      price: '₹7,999',
      period: '365 Days',
      badge: 'Save ₹3,989',
      badgeColor: 'bg-purple-950/50 text-purple-400 border-purple-500/30',
      cta: 'Maximize Savings',
      popular: false
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      <SEOManager
        title="Chameleon Pro Pricing — Flexible Remote Access Subscriptions"
        description="View pricing plans for Chameleon Pro. Sub-100ms low-latency remote desktop streaming, end-to-end encryption, multi-monitor support, and file transfer."
        keywords={KEYWORDS.secondary}
        canonicalPath="/pricing"
        schemas={[pageSchema]}
      />

      <Breadcrumbs items={[{ name: 'Pricing', item: '/pricing' }]} />

      {/* Header Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium text-cyan-400 bg-cyan-950/30 border border-cyan-500/20 mb-2">
          <Sparkles size={12} />
          <span>CHAMELEON PRO SAAS</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
          Unlock High-Performance <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-500">
            Remote Control Limits
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          Upgrade to Chameleon Pro for unlimited sessions, low-latency streaming, and complete administrative control. No binding contracts, cancel anytime.
        </p>
      </div>

      {/* Plans Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 ${
              plan.popular
                ? 'bg-gradient-to-b from-[#0F172A]/80 to-[#070B14]/90 border-2 border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.15)] scale-[1.03]'
                : 'bg-white/5 border border-white/8 hover:bg-white/10'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-cyan-500 text-slate-950 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg">
                Recommended
              </div>
            )}

            <div>
              {/* Badge/Savings */}
              <div className="flex justify-between items-start mb-4">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${plan.badgeColor}`}>
                  {plan.badge}
                </span>
              </div>

              {/* Title & Price */}
              <h3 className="text-xl font-bold text-slate-100 mb-1">{plan.name}</h3>
              <p className="text-xs text-slate-400 font-mono mb-4">Duration: {plan.period}</p>
              
              <div className="flex items-baseline gap-1.5 mb-6">
                <span className="text-4xl font-extrabold text-white tracking-tight">{plan.price}</span>
                <span className="text-xs text-slate-400 font-medium">/ term</span>
              </div>

              <div className="h-px bg-white/8 mb-6" />

              {/* Feature Checklist */}
              <ul className="space-y-3 mb-8">
                {features.slice(0, plan.id === 'MONTHLY' ? 6 : features.length).map((feat, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-xs text-slate-300">
                    <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <a
              href={`${CLIENT_URL}/billing?plan=${plan.id}`}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-center transition-all ${
                plan.popular
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_4px_20px_rgba(6,182,212,0.35)]'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10 text-white'
              }`}
            >
              {plan.cta}
            </a>
          </div>
        ))}
      </div>

      {/* Feature Section Header */}
      <div className="bg-[#111827]/30 border border-white/6 rounded-3xl p-8 max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-md">
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="text-emerald-400" />
            Enterprise-Grade End-to-End Security
          </h3>
          <p className="text-xs text-slate-400 max-w-xl">
            All Chameleon Pro connections use DTLS/SRTP cryptography with hardware-derived device tokens. Rest assured that no remote screen data or clipboard logs ever traverse our signaling server unencrypted.
          </p>
        </div>
        <div className="flex gap-4 shrink-0">
          <a
            href={`${CLIENT_URL}/signup`}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/10 hover:opacity-90"
          >
            Create Account
          </a>
        </div>
      </div>
    </div>
  );
}
