import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Monitor, CheckCircle2, AlertTriangle, Play, RefreshCw, LogOut, Shield } from 'lucide-react';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'https://chameleon-1.onrender.com';

export default function MyDevices() {
  const [user, setUser] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfileAndDevices();
  }, []);

  const fetchProfileAndDevices = async () => {
    const token = localStorage.getItem('chameleon_access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${SIGNALING_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'TOKEN_EXPIRED') {
          // Attempt refresh
          const refreshed = await attemptRefresh();
          if (refreshed) return fetchProfileAndDevices();
        }
        throw new Error(data.error || 'Failed to load profile');
      }

      setUser(data.user);
      setDevices(data.devices || []);
    } catch (err) {
      console.error(err.message);
      localStorage.removeItem('chameleon_access_token');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const attemptRefresh = async () => {
    const refreshToken = localStorage.getItem('chameleon_refresh_token');
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${SIGNALING_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      const data = await res.json();
      if (res.ok && data.accessToken) {
        localStorage.setItem('chameleon_access_token', data.accessToken);
        return true;
      }
    } catch (e) {}
    return false;
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('chameleon_refresh_token');
    await fetch(`${SIGNALING_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    }).catch(() => {});

    localStorage.removeItem('chameleon_access_token');
    localStorage.removeItem('chameleon_refresh_token');
    localStorage.removeItem('chameleon_user');
    navigate('/login');
  };

  const handleConnectDevice = (deviceId) => {
    navigate(`/?device=${deviceId}`);
  };

  return (
    <div className="min-h-screen bg-[#05060b] text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">My Devices Control Center</h1>
              <p className="text-xs text-slate-400">Logged in as {user?.email || 'User'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchProfileAndDevices}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
              title="Refresh Devices"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Devices Grid */}
        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-4">Claimed Host Machines</h2>

          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              Loading your claimed devices...
            </div>
          ) : devices.length === 0 ? (
            <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-12 text-center space-y-4">
              <Monitor className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-slate-300 font-semibold text-lg">No Devices Claimed Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Install the Chameleon Desktop Agent on your host machine and log in to automatically link it to your account for 1-click remote access.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {devices.map((device) => {
                const isOnline = new Date() - new Date(device.lastSeen) < 15000;

                return (
                  <div key={device.deviceId} className="bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl p-6 flex flex-col justify-between space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-bold text-slate-100 text-base">{device.hostname || 'Desktop Host'}</h3>
                        <p className="text-xs font-mono text-slate-500">{device.deviceId}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase flex items-center space-x-1.5 border ${
                        isOnline
                          ? 'bg-green-500/10 text-green-400 border-green-500/20 animate-pulse'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-slate-600'}`}></span>
                        <span>{isOnline ? 'Online' : 'Offline'}</span>
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-slate-400 border-t border-slate-900 pt-3">
                      <div className="flex justify-between">
                        <span>OS:</span>
                        <span className="text-slate-200">{device.osName || 'Windows'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Agent Version:</span>
                        <span className="text-slate-200">{device.agentVersion || 'v1.4.1'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleConnectDevice(device.deviceId)}
                      disabled={!isOnline}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/15 disabled:opacity-40 flex items-center justify-center space-x-2 text-sm"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{isOnline ? '1-Click Connect' : 'Machine Offline'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
