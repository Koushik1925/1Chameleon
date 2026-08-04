import React from 'react';
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
      icon: '⚡',
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
      icon: '⭐',
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
      icon: '👑',
      cta: 'Go Monthly',
      popular: false,
      badge: 'Best Value'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
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
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
          Choose Your Plan
        </h1>
        <p className="text-sm text-slate-400">
          Select the duration that works best for you.
        </p>
      </div>

      {/* 3 Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-center items-center max-w-5xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
              plan.popular
                ? 'bg-gradient-to-b from-[#0F172A]/90 to-[#070B14]/95 border-2 border-cyan-500/50 shadow-[0_15px_45px_rgba(6,182,212,0.18)] min-h-[360px] md:scale-[1.04]'
                : 'bg-white/5 border border-white/8 hover:bg-white/10 hover:border-white/20 shadow-lg min-h-[340px]'
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-cyan-500 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-full shadow-lg">
                {plan.badge}
              </div>
            )}

            <div className="flex flex-col items-center text-center space-y-5">
              {/* Icon */}
              <span className="text-4xl filter drop-shadow-[0_0_15px_rgba(6,182,212,0.3)] select-none">
                {plan.icon}
              </span>

              {/* Title */}
              <h3 className="text-lg font-bold text-slate-100 tracking-wide">{plan.name}</h3>
              
              {/* Price */}
              <div className="text-4xl font-extrabold text-white tracking-tight">
                {plan.price}
              </div>

              {/* Duration & Daily Cost */}
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-medium tracking-wide">{plan.duration}</p>
                <p className="text-[11px] text-cyan-400 font-mono font-bold tracking-wide">{plan.dailyCost}</p>
              </div>
            </div>

            <a
              href={`${CLIENT_URL}/billing?plan=${plan.id}`}
              className={`w-full mt-8 py-3.5 px-4 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                plan.popular
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_4px_20px_rgba(6,182,212,0.35)]'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white'
              }`}
            >
              {plan.cta}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
