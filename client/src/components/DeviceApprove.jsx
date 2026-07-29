import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Laptop, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'https://chameleon-1.onrender.com';

export default function DeviceApprove() {
  const [searchParams] = useSearchParams();
  const [userCode, setUserCode] = useState(searchParams.get('code') || '');
  const [status, setStatus] = useState('idle'); // idle -> approving -> success -> error
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleApprove = async () => {
    const token = localStorage.getItem('chameleon_access_token');
    if (!token) {
      navigate('/login?redirect=/device?code=' + userCode);
      return;
    }

    setStatus('approving');
    setErrorMsg('');

    try {
      const response = await fetch(`${SIGNALING_URL}/api/auth/device-approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userCode })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authorization failed');

      setStatus('success');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#05060b] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl shadow-2xl p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-6 text-cyan-400">
          <Laptop className="w-7 h-7" />
        </div>

        <h2 className="text-2xl font-bold text-slate-100">Authorize Desktop Device</h2>
        <p className="text-xs text-slate-400 mt-1">Approve connection request from Desktop Agent</p>

        {status === 'success' ? (
          <div className="mt-8 bg-green-500/10 border border-green-500/20 text-green-400 p-6 rounded-xl space-y-2">
            <CheckCircle className="w-8 h-8 mx-auto" />
            <h3 className="font-semibold text-lg">Device Authorized!</h3>
            <p className="text-xs text-slate-400">You can now close this tab. Your Desktop Agent has been claimed and connected.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Authorization Code</label>
              <input
                type="text"
                value={userCode}
                onChange={(e) => setUserCode(e.target.value)}
                placeholder="Enter 6-digit Code"
                className="w-full text-center text-2xl font-mono tracking-widest bg-slate-900 border border-slate-800 rounded-xl py-3 text-cyan-400 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg">
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleApprove}
              disabled={!userCode || status === 'approving'}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/15 disabled:opacity-50"
            >
              {status === 'approving' ? 'Authorizing...' : 'Approve Connection'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
