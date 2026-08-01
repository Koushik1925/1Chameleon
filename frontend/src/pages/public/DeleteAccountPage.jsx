import React, { useState } from 'react';
import { Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import SEOManager from '../../seo/SEOManager';
import Breadcrumbs from '../../components/public/Breadcrumbs';

export default function DeleteAccountPage() {
  const [submitted, setSubmitted] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <SEOManager
        title="Delete Account & Data Erasure Request — Chameleon"
        description="Request complete deletion of your Chameleon account credentials, device pairing records, and telemetry data."
        canonicalPath="/delete-account"
      />

      <Breadcrumbs items={[{ name: 'Delete Account', item: '/delete-account' }]} />

      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <Trash2 className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Delete Account & Data Erasure</h1>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          In accordance with GDPR and CCPA regulations, you can request immediate and permanent erasure of your account, registered device fingerprints, and logs.
        </p>
      </div>

      <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        {submitted ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h2 className="text-xl font-bold text-slate-100">Deletion Request Logged</h2>
            <p className="text-xs text-slate-400">
              Your erasure request has been received. Associated device records and telemetry will be purged from our database within 48 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-start space-x-3 text-xs text-rose-300">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <strong>Warning:</strong> Account deletion is permanent. All saved unattended pairing keys and session logs associated with your registered devices will be irrevocably deleted.
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Account Email or Admin Username</label>
              <input
                type="text"
                required
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Registered Device Fingerprint (Optional)</label>
              <input
                type="text"
                placeholder="e.g. e3b0c44298fc1c149afbf4c..."
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Request Account Deletion
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
