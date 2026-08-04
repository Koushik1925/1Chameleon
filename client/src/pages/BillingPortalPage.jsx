import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Sparkles, CheckCircle2, ShieldCheck, Download, AlertCircle, 
  CreditCard, Loader2, ArrowRight, UserCheck, Calendar, Lock,
  Zap, Star, Crown
} from 'lucide-react';
import Navbar from '../components/common/Navbar';

const SIGNALING_URL = (import.meta.env.VITE_SIGNALING_URL || 'https://chameleon-1.onrender.com').replace(/\/$/, '');

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function BillingPortalPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [subStatus, setSubStatus] = useState(null);
  const [payments, setPayments] = useState([]);
  const [showPlans, setShowPlans] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [plans, setPlans] = useState({
    DAILY: { id: "DAILY", name: "Daily Pass", duration: "24 Hours", amount: 34900, iconName: "Zap", dailyCost: "₹349/day", buttonText: "Get Started", popular: false, badge: "" },
    WEEKLY: { id: "WEEKLY", name: "Weekly Pass", duration: "7 Days", amount: 79900, iconName: "Star", dailyCost: "₹114/day", buttonText: "Choose Weekly", popular: true, badge: "Most Popular" },
    MONTHLY: { id: "MONTHLY", name: "Monthly Pass", duration: "30 Days", amount: 119900, iconName: "Crown", dailyCost: "₹40/day", buttonText: "Go Monthly", popular: false, badge: "Best Value" }
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

  useEffect(() => {
    fetchProfileAndBilling();
  }, []);

  const fetchProfileAndBilling = async () => {
    const token = localStorage.getItem('chameleon_access_token');
    if (!token) {
      navigate('/login?redirect=/billing');
      return;
    }

    try {
      // 1. Get profile
      const profRes = await fetch(`${SIGNALING_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!profRes.ok) throw new Error('Session expired');
      const profData = await profRes.json();
      setUser(profData.user);

      // 2. Get billing status
      const statusRes = await fetch(`${SIGNALING_URL}/api/billing/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setSubStatus(statusData);
        if (statusData.status === 'FREE' || statusData.status === 'EXPIRED') {
          setShowPlans(true);
        }
      }

      // 3. Get payments history
      const payRes = await fetch(`${SIGNALING_URL}/api/billing/payments?page=1&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (payRes.ok) {
        const payData = await payRes.json();
        setPayments(payData.items || []);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to sync billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planKey) => {
    setErrorMsg('');
    setCheckoutLoading(true);
    const token = localStorage.getItem('chameleon_access_token');

    try {
      // Load script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error('Razorpay SDK failed to load');

      // Create order
      const orderRes = await fetch(`${SIGNALING_URL}/api/billing/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan: planKey })
      });
      if (!orderRes.ok) {
        const errData = await orderRes.json();
        throw new Error(errData.error || 'Order creation failed');
      }

      const order = await orderRes.json();

      // Launch Razorpay standard checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TLHGJLmvnkWgC7',
        amount: order.amount,
        currency: order.currency,
        name: 'Chameleon Pro',
        description: `Chameleon Pro ${planKey} Plan`,
        image: '/logo.png',
        order_id: order.orderId,
        handler: async (response) => {
          setVerifyingPayment(true);
          
          // Poll backend status until it changes to ACTIVE
          let attempts = 0;
          const pollInterval = setInterval(async () => {
            attempts++;
            if (attempts > 15) { // 30 seconds max
              clearInterval(pollInterval);
              setVerifyingPayment(false);
              setCheckoutLoading(false);
              setErrorMsg('Payment verification is taking longer than expected. Check dashboard shortly.');
              return;
            }

            try {
              const checkRes = await fetch(`${SIGNALING_URL}/api/billing/status`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const checkData = await checkRes.json();
              if (checkData.status === 'ACTIVE' || checkData.plan === planKey) {
                clearInterval(pollInterval);
                setVerifyingPayment(false);
                setCheckoutLoading(false);
                navigate('/billing/success');
              }
            } catch (e) {}
          }, 2000);
        },
        prefill: {
          name: user?.profile?.name || '',
          email: user?.email || ''
        },
        theme: {
          color: '#06B6D4'
        },
        modal: {
          ondismiss: () => {
            setCheckoutLoading(false);
          }
        }
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.open();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Payment launch failed');
      setCheckoutLoading(false);
    }
  };

  const handleDownloadInvoice = (paymentId, invoiceNumber) => {
    const token = localStorage.getItem('chameleon_access_token');
    fetch(`${SIGNALING_URL}/api/billing/invoices/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice-${invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => alert('Failed to download invoice PDF'));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090D17] text-[#9CA3AF] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090D17] text-[#9CA3AF] selection:bg-[#06B6D4]/30 selection:text-cyan-200">
      <Navbar />

      {verifyingPayment && (
        <div className="fixed inset-0 bg-[#090D17]/95 z-[100] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
          <h2 className="text-xl font-bold text-white tracking-wide">Verifying Payment Transaction...</h2>
          <p className="text-sm text-slate-400">Please do not close this window or navigate away.</p>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-8 pt-24 px-4 pb-12 relative z-10">
        
        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-center gap-3 p-4 bg-red-950/40 border border-red-500/30 text-red-400 rounded-2xl">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{errorMsg}</span>
          </div>
        )}

        {/* Dashboard Active Header (If own Active plan) */}
        {subStatus && subStatus.status !== 'FREE' && subStatus.status !== 'EXPIRED' && (
          <div className="liquid-glass-card rounded-[24px] p-8 border border-white/6 shadow-[0_15px_40px_rgba(0,0,0,0.4)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-full filter blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium text-emerald-400 bg-emerald-950/30 border border-emerald-500/20">
                  <UserCheck size={12} />
                  <span>ACTIVE SUBSCRIPTION</span>
                </div>
                <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
                  Chameleon Pro <span className="text-cyan-400 text-lg font-mono">({plans[subStatus.plan]?.name})</span>
                </h2>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-300">
                  <span className="flex items-center gap-1.5"><Calendar size={14} className="text-cyan-400" /> Expires: {new Date(subStatus.expires).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1.5 font-bold"><Sparkles size={14} className="text-emerald-400" /> {subStatus.daysRemaining} Days Remaining</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <button
                  onClick={() => setShowPlans(!showPlans)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white/5 border border-white/8 text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  {showPlans ? 'Hide Pricing' : 'Change Plan'}
                </button>
                <button
                  onClick={() => handleSubscribe(subStatus.plan)}
                  disabled={checkoutLoading}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg hover:opacity-90 transition-all flex items-center gap-2"
                >
                  {checkoutLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Renew Subscription
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade / Pricing Cards Block */}
        {showPlans && (
          <div className="space-y-8">
            {/* Centered Header */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                Choose Your Plan
              </h2>
              <p className="text-sm text-slate-400">
                One product. Three ways to access it.
              </p>
            </div>

            {/* Unified Glass Panel */}
            <div className="bg-white/[0.03] border border-white/8 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-4xl mx-auto divide-y divide-white/8 overflow-hidden">
              {Object.keys(plans).map((key) => {
                const plan = plans[key];
                const formattedPrice = plan.amount / 100;
                const PlanIcon = plan.iconName === 'Zap' ? Zap : plan.iconName === 'Star' ? Star : Crown;

                return (
                  <div
                    key={key}
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
                        <span className="text-xl font-black text-white tracking-tight">₹{formattedPrice.toLocaleString()}</span>
                        <span className="text-[11px] font-mono text-cyan-400 font-bold">{plan.dailyCost}</span>
                      </div>
                    </div>

                    {/* Right: Button */}
                    <div className="shrink-0 flex items-center">
                      <button
                        onClick={() => handleSubscribe(key)}
                        disabled={checkoutLoading}
                        className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-250 flex items-center gap-1 cursor-pointer ${
                          plan.popular
                            ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_4px_15px_rgba(6,182,212,0.25)] hover:scale-[1.02]'
                            : 'bg-white/5 border border-white/8 hover:bg-white/10 hover:border-white/20 text-white hover:scale-[1.02]'
                        }`}
                      >
                        <span>{plan.buttonText}</span>
                        <span className="text-sm transition-transform duration-250 group-hover:translate-x-0.5">→</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Billing Payments History */}
        <div className="bg-[#111827]/30 border border-white/6 rounded-3xl p-6 md:p-8 backdrop-blur-md">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <CreditCard className="text-cyan-400 w-5 h-5" />
            Payment History & Invoices
          </h3>

          {payments.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              No payments processed yet on this account.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/6 text-slate-400 uppercase tracking-wider font-mono">
                    <th className="pb-3 pr-4">Invoice No</th>
                    <th className="pb-3 px-4">Amount</th>
                    <th className="pb-3 px-4">Method</th>
                    <th className="pb-3 px-4">Date</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 pl-4 text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6 text-slate-300">
                  {payments.map((pay) => (
                    <tr key={pay._id} className="hover:bg-white/2 transition-colors">
                      <td className="py-4 pr-4 font-mono font-bold text-white">{pay.invoiceNumber || 'Processing'}</td>
                      <td className="py-4 px-4 font-mono">₹{(pay.amount / 100).toFixed(2)}</td>
                      <td className="py-4 px-4 uppercase font-mono text-[10px]">{pay.paymentMethod || 'card'}</td>
                      <td className="py-4 px-4">{new Date(pay.paidAt).toLocaleDateString()}</td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                          {pay.status}
                        </span>
                      </td>
                      <td className="py-4 pl-4 text-right">
                        {pay.invoiceNumber && (
                          <button
                            onClick={() => handleDownloadInvoice(pay._id, pay.invoiceNumber)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                            title="Download PDF Invoice"
                          >
                            <Download size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Direct Help redirect info */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-cyan-950/20 border border-cyan-500/20 rounded-[20px] p-6 text-center sm:text-left backdrop-blur-md">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
              <Lock className="w-4 h-4 text-cyan-400" /> Need Help with Your Billing?
            </h4>
            <p className="text-xs text-slate-400">
              For subscription inquiries, failed orders, or custom seat licensing.
            </p>
          </div>
          <button
            onClick={() => navigate('/contact')}
            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white text-xs font-bold hover:bg-white/10 transition-all shrink-0 cursor-pointer"
          >
            Contact Technical Support
          </button>
        </div>

      </div>
    </div>
  );
}
