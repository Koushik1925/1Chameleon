import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'https://chameleon-1.onrender.com';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '607598122306-oal27tlr3v870b9bupenf55p6oecmg5j.apps.googleusercontent.com';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Load Google Identity Services Script dynamically
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
      navigate('/my-devices');
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

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
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
    <div className="min-h-screen bg-[#090D17] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-[#06B6D4]/30 selection:text-cyan-200">
      <div className="w-full max-w-md bg-[#111827]/72 border border-white/6 rounded-[18px] backdrop-blur-[12px] shadow-[0_15px_40px_rgba(0,0,0,0.45)] p-8 z-10">
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
            <span className="font-extrabold text-2xl tracking-tight text-[#F3F4F6] leading-none">chameleon</span>
            <span className="text-[10px] font-mono font-extrabold tracking-[0.15em] bg-gradient-to-r from-[#22C55E] via-[#06B6D4] to-[#8B5CF6] bg-clip-text text-transparent uppercase mt-1.5">
              SEE. CONNECT. CONTROL.
            </span>
          </Link>
          <h2 className="text-xl font-bold text-[#F3F4F6] tracking-tight mt-3">Welcome Back</h2>
          <p className="text-xs text-[#9CA3AF] font-mono uppercase tracking-[0.15em] mt-1">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-semibold text-[#9CA3AF] uppercase tracking-[0.15em] mb-2">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-4 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#090D17] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-[#F3F4F6] text-sm focus:outline-none focus:border-[#06B6D4] transition-colors"
                placeholder="name@domain.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-[#9CA3AF] uppercase tracking-[0.15em] mb-2">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-4 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#090D17] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-[#F3F4F6] text-sm focus:outline-none focus:border-[#06B6D4] transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#22C55E] to-[#06B6D4] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(6,182,212,0.3)] text-white font-bold py-3 rounded-xl transition-all duration-150 ease-out disabled:opacity-50 flex items-center justify-center space-x-2 active:scale-98 shadow-md"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-white/5"></div>
          <span className="px-3 text-xs text-[#9CA3AF] font-mono uppercase tracking-[0.15em]">or</span>
          <div className="flex-1 border-t border-white/5"></div>
        </div>

        <div className="w-full flex justify-center min-h-[44px]">
          <div id="googleBtnContainer" className="w-full flex justify-center"></div>
        </div>

        <p className="text-center text-xs text-[#9CA3AF] mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#06B6D4] hover:text-[#06B6D4]/80 font-semibold transition-colors">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
