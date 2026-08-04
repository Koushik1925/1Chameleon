import React from 'react';
import { Zap, Star, Crown } from 'lucide-react';
import SEOManager from '../../seo/SEOManager';
import Breadcrumbs from '../../components/public/Breadcrumbs';
import { getWebPageSchema } from '../../seo/schemaGenerators';
import { KEYWORDS } from '../../seo/seoConfig';

const CLIENT_URL = import.meta.env.VITE_CLIENT_URL || 'http://localhost:5173';

export default function PricingPage() {
  const pageSchema = getWebPageSchema({
    title: 'Chameleon Pro Subscription & Pricing Plans',
    description: 'Choose the best subscription plan for Chameleon Pro: Daily, Weekly, and Monthly passes. High-speed low-latency remote desktop streaming.',
    path: '/pricing'
  });

  const plans = [
    {
      id: 'DAILY',
      name: 'Daily Pass',
      price: '₹349',
      duration: '24 Hours',
      dailyCost: '₹349/day',
      iconName: 'Zap',
      cta: 'Get Started',
      popular: false,
      badge: ''
    },
    {
      id: 'WEEKLY',
      name: 'Weekly Pass',
      price: '₹799',
      duration: '7 Days',
      dailyCost: '₹114/day',
      iconName: 'Star',
      cta: 'Choose Weekly',
      popular: true,
      badge: 'Most Popular'
    },
    {
      id: 'MONTHLY',
      name: 'Monthly Pass',
      price: '₹1,199',
      duration: '30 Days',
      dailyCost: '₹40/day',
      iconName: 'Crown',
      cta: 'Go Monthly',
      popular: false,
      badge: 'Best Value'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <SEOManager
        title="Chameleon Pro Pricing — Flexible Remote Access Subscriptions"
        description="View pricing plans for Chameleon Pro: Daily, Weekly, and Monthly passes. Sub-100ms low-latency remote desktop streaming with end-to-end encryption."
        keywords={KEYWORDS.secondary}
        canonicalPath="/pricing"
        schemas={[pageSchema]}
      />

      <Breadcrumbs items={[{ name: 'Pricing', item: '/pricing' }]} />

      {/* Centered Header Section */}
      <div className="text-center space-y-2 max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight animate-fade-in">
          Choose Your Plan
        </h1>
        <p className="text-sm text-slate-400">
          One product. Three ways to access it.
        </p>
      </div>

      {/* Unified Settings Glass Panel */}
      <div className="bg-white/[0.03] border border-white/8 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-4xl mx-auto divide-y divide-white/8 overflow-hidden">
        {plans.map((plan) => {
          const PlanIcon = plan.iconName === 'Zap' ? Zap : plan.iconName === 'Star' ? Star : Crown;

          return (
            <div
              key={plan.id}
              className={`flex flex-col md:flex-row md:items-center justify-between p-6 md:p-8 transition-all duration-300 gap-6 group hover:bg-white/[0.02] ${
                plan.popular ? 'relative bg-white/[0.01]' : ''
              }`}
            >
              {/* Left: Icon, Name & Inline Badge */}
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/8 text-cyan-400 group-hover:text-cyan-300 group-hover:bg-white/10 group-hover:border-white/15 transition-all shadow-sm">
                  <PlanIcon className="w-5 h-5" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="font-bold text-slate-100 text-lg">{plan.name}</span>
                  {plan.badge && (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 max-w-fit uppercase">
                      {plan.badge}
                    </span>
                  )}
                </div>
              </div>

              {/* Middle: Details & Price */}
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2 md:ml-auto">
                {/* Duration */}
                <div className="flex flex-col text-left md:text-right">
                  <span className="text-sm font-semibold text-slate-100">{plan.duration}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Duration</span>
                </div>
                <div className="w-px h-8 bg-white/8 hidden sm:block" />
                {/* Price & Daily Cost */}
                <div className="flex flex-col text-left md:text-right">
                  <span className="text-xl font-black text-white tracking-tight">{plan.price}</span>
                  <span className="text-[11px] font-mono text-cyan-400 font-bold">{plan.dailyCost}</span>
                </div>
              </div>

              {/* Right: Button */}
              <div className="shrink-0 flex items-center">
                <a
                  href={`${CLIENT_URL}/billing?plan=${plan.id}`}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-250 flex items-center gap-1 cursor-pointer ${
                    plan.popular
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_4px_15px_rgba(6,182,212,0.25)] hover:scale-[1.02]'
                      : 'bg-white/5 border border-white/8 hover:bg-white/10 hover:border-white/20 text-white hover:scale-[1.02]'
                  }`}
                >
                  <span>{plan.cta}</span>
                  <span className="text-sm transition-transform duration-250 group-hover:translate-x-0.5">→</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
