import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, User, ArrowRight } from 'lucide-react';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'https://chameleon-1.onrender.com';

export default function Signup({ onLoginSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${SIGNALING_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      localStorage.setItem('chameleon_access_token', data.accessToken);
      localStorage.setItem('chameleon_refresh_token', data.refreshToken);
      localStorage.setItem('chameleon_user', JSON.stringify(data.user));

      if (onLoginSuccess) onLoginSuccess(data.user);
      navigate('/my-devices');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#06B6D4]/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#8B5CF6]/5 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#111827] border border-[#1F2937] rounded-2xl shadow-2xl p-8 z-10">
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex flex-col items-center group mb-2">
            <img 
              src="/logo.png" 
              alt="Chameleon Logo" 
              className="w-14 h-14 object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-transform mb-2" 
              onError={(e) => {
                e.target.src = '/logo.png';
              }}
            />
            <span className="font-extrabold text-2xl tracking-tight text-[#E5E7EB] leading-none">chameleon</span>
            <span className="text-[10px] font-extrabold tracking-[1.6px] bg-gradient-to-r from-[#22C55E] via-[#06B6D4] to-[#8B5CF6] bg-clip-text text-transparent uppercase mt-1">
              SEE. CONNECT. CONTROL.
            </span>
          </Link>
          <h2 className="text-xl font-bold text-[#E5E7EB] tracking-wide mt-3">Create Account</h2>
          <p className="text-xs text-[#9CA3AF] mt-1 uppercase tracking-widest">Get started in seconds</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-2">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-[#9CA3AF] absolute left-4 top-3.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0B0F1A] border border-[#1F2937] rounded-xl pl-11 pr-4 py-3 text-[#E5E7EB] text-sm focus:outline-none focus:border-[#06B6D4] transition-colors"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-2">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-4 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0B0F1A] border border-[#1F2937] rounded-xl pl-11 pr-4 py-3 text-[#E5E7EB] text-sm focus:outline-none focus:border-[#06B6D4] transition-colors"
                placeholder="name@domain.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-2">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-4 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0B0F1A] border border-[#1F2937] rounded-xl pl-11 pr-4 py-3 text-[#E5E7EB] text-sm focus:outline-none focus:border-[#06B6D4] transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#22C55E] to-[#06B6D4] hover:opacity-95 text-white font-bold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/15 disabled:opacity-50 flex items-center justify-center space-x-2 active:scale-98"
          >
            <span>{loading ? 'Creating account...' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-[#9CA3AF] mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-[#06B6D4] hover:text-[#06B6D4]/80 font-semibold transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
