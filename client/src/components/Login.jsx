import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';

const SIGNALING_URL = (import.meta.env.VITE_SIGNALING_URL || 'https://chameleon-1.onrender.com').replace(/\/$/, '');
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '607598122306-oal27tlr3v870b9bupenf55p6oecmg5j.apps.googleusercontent.com';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      if (window.google && GOOGLE_CLIENT_ID) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse
        });
        const container = document.getElementById('googleBtnContainer');
        if (container) {
          window.google.accounts.id.renderButton(container, {
            theme: 'filled_black',
            size: 'large',
            width: 380,
            text: 'continue_with',
            shape: 'pill'
          });
        }
      }
    };
    document.body.appendChild(script);
  }, []);

  const handleGoogleCredentialResponse = async (response) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${SIGNALING_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google login failed');
      localStorage.setItem('chameleon_access_token', data.accessToken);
      localStorage.setItem('chameleon_refresh_token', data.refreshToken);
      localStorage.setItem('chameleon_user', JSON.stringify(data.user));
      if (onLoginSuccess) onLoginSuccess(data.user);
      const redirectUrl = searchParams.get('redirect') || '/my-devices';
      navigate(redirectUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${SIGNALING_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('chameleon_access_token', data.accessToken);
      localStorage.setItem('chameleon_refresh_token', data.refreshToken);
      localStorage.setItem('chameleon_user', JSON.stringify(data.user));
      if (onLoginSuccess) onLoginSuccess(data.user);
      const redirectUrl = searchParams.get('redirect') || '/my-devices';
      navigate(redirectUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D17] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-[#06B6D4]/30 selection:text-cyan-200">
      {/* Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-tr from-[#22C55E]/8 via-[#06B6D4]/8 to-[#8B5CF6]/6 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md liquid-glass-dialog rounded-3xl p-8 z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex flex-col items-center group mb-2">
            <img
              src="/logo.png"
              alt="Chameleon Logo"
              className="w-14 h-14 object-contain drop-shadow-[0_0_20px_rgba(6,182,212,0.35)] group-hover:scale-105 transition-transform duration-250 mb-2"
              onError={(e) => { e.target.src = '/logo.png'; }}
            />
            <span className="font-extrabold text-2xl tracking-tight text-[#F3F4F6] leading-none">chameleon</span>
            <span className="text-[10px] font-mono font-extrabold tracking-[0.15em] bg-gradient-to-r from-[#22C55E] via-[#06B6D4] to-[#8B5CF6] bg-clip-text text-transparent uppercase mt-1.5">
              SEE. CONNECT. CONTROL.
            </span>
          </Link>
          <h2 className="text-xl font-bold text-[#F3F4F6] tracking-tight mt-4">Welcome Back</h2>
          <p className="text-[10px] text-[#9CA3AF] font-mono uppercase tracking-[0.15em] mt-1">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-2xl mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono font-semibold text-[#9CA3AF] uppercase tracking-[0.15em] mb-2">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#9CA3AF]/60 absolute left-4 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full liquid-glass-input rounded-2xl pl-11 pr-4 py-3 text-[#F3F4F6] text-sm"
                placeholder="name@domain.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-semibold text-[#9CA3AF] uppercase tracking-[0.15em] mb-2">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#9CA3AF]/60 absolute left-4 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full liquid-glass-input rounded-2xl pl-11 pr-4 py-3 text-[#F3F4F6] text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full liquid-glass-btn-primary text-white font-bold py-3 rounded-2xl disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-white/6"></div>
          <span className="px-3 text-[10px] text-[#9CA3AF] font-mono uppercase tracking-[0.15em]">or</span>
          <div className="flex-1 border-t border-white/6"></div>
        </div>

        <div className="w-full flex justify-center min-h-[44px]">
          <div id="googleBtnContainer" className="w-full flex justify-center"></div>
        </div>

        <p className="text-center text-xs text-[#9CA3AF] mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#06B6D4] hover:text-cyan-300 font-semibold transition-colors">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
