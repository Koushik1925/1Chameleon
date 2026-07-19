import React, { useState } from 'react';
import { Shield } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLoginSuccess(data.token, data.username);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05060b] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Glow Rings */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-600/10 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl shadow-2xl p-8 z-10 glow-cyan">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/20">
            <Shield className="text-white w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-wide">CHAMELEON</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Signaling Administration Portal</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="Enter admin username"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="Enter admin password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium py-3 rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/15 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Secure Authorization'}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-[10px] text-slate-500">
            Authorized administrative access only. All authorization failures are logged.
          </p>
        </div>
      </div>
    </div>
  );
}
