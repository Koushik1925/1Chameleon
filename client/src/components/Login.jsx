import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

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

  const handleGoogleLogin = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    } else {
      setError('Google Identity Services loading... Please try again in a moment.');
    }
  };

  return (
    <div className="min-h-screen bg-[#05060b] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-600/10 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl shadow-2xl p-8 z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/20">
            <Shield className="text-white w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-wide">Welcome Back</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Sign in to your Chameleon account</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="name@domain.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium py-3 rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/15 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-slate-900"></div>
          <span className="px-3 text-xs text-slate-500 uppercase tracking-wider">or</span>
          <div className="flex-1 border-t border-slate-900"></div>
        </div>

        <div className="w-full flex justify-center min-h-[44px]">
          <div id="googleBtnContainer" className="w-full flex justify-center"></div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-cyan-400 hover:text-cyan-300 font-semibold">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
