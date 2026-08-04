import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Play, RefreshCw, LogOut, Shield } from 'lucide-react';

const SIGNALING_URL = (import.meta.env.VITE_SIGNALING_URL || 'https://chameleon-1.onrender.com').replace(/\/$/, '');

export default function MyDevices() {
  const [user, setUser] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfileAndDevices();
    const interval = setInterval(fetchProfileAndDevices, 8000);
    return () => clearInterval(interval);
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
    <div className="min-h-screen bg-[#090D17] text-[#9CA3AF] p-6 selection:bg-[#06B6D4]/30 selection:text-cyan-200">
      <div className="max-w-6xl mx-auto space-y-8 pt-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#111827]/72 border border-white/6 rounded-[18px] p-6 backdrop-blur-[12px] shadow-[0_15px_40px_rgba(0,0,0,0.45)]">
          <div className="flex items-center space-x-4">
            {user?.profile?.avatar ? (
              <img src={user.profile.avatar} alt="Avatar" className="w-12 h-12 rounded-xl object-cover border border-[#06B6D4]/30 shadow-lg shadow-[#06B6D4]/10" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#22C55E] to-[#06B6D4] flex items-center justify-center shadow-lg shadow-[#06B6D4]/10">
                <Shield className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#F3F4F6]">Welcome, {user?.profile?.name || 'User'}</h1>
              <p className="text-xs text-[#9CA3AF]">Signed in as <span className="text-[#06B6D4] font-semibold">{user?.email}</span></p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchProfileAndDevices}
              className="p-2.5 rounded-xl bg-[#090D17]/80 hover:bg-white/5 border border-white/8 text-[#9CA3AF] hover:text-[#F3F4F6] transition-all duration-150 ease-out"
              title="Refresh Devices"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2.5 rounded-xl text-xs font-semibold active:scale-98 transition-all duration-150 ease-out"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Devices Grid */}
        <div>
          <h2 className="text-lg font-semibold text-[#F3F4F6] mb-4 tracking-tight">Claimed Host Machines</h2>

          {loading ? (
            <div className="p-12 text-center text-[#9CA3AF] text-sm">
              Loading your claimed devices...
            </div>
          ) : devices.length === 0 ? (
            <div className="bg-[#111827]/72 border border-white/6 rounded-[18px] p-12 text-center space-y-4 backdrop-blur-[12px] shadow-[0_15px_40px_rgba(0,0,0,0.45)]">
              <Monitor className="w-12 h-12 text-[#9CA3AF]/60 mx-auto" />
              <h3 className="text-[#F3F4F6] font-semibold text-lg">No Devices Claimed Yet</h3>
              <p className="text-xs text-[#9CA3AF] max-w-md mx-auto">
                Install the Chameleon Desktop Agent on your host machine and log in to automatically link it to your account for 1-click remote access.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {devices.map((device) => {
                const isOnline = device.isOnline !== undefined ? device.isOnline : (new Date() - new Date(device.lastSeen) < 30000);

                return (
                  <div key={device.deviceId} className="bg-[#111827]/72 border border-white/6 rounded-[18px] p-6 flex flex-col justify-between space-y-4 backdrop-blur-[12px] transition-all duration-150 ease-out hover:-translate-y-1.5 hover:border-[#06B6D4]/35 hover:shadow-[0_15px_40px_rgba(0,0,0,0.45)]">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-bold text-[#F3F4F6] text-base">{device.hostname || 'Desktop Host'}</h3>
                        <p className="text-xs font-mono text-[#9CA3AF]/70">{device.deviceId}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase flex items-center space-x-1.5 border ${
                        isOnline
                          ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20 animate-pulse'
                          : 'bg-[#090D17] text-[#9CA3AF] border-white/5'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#22C55E]' : 'bg-[#9CA3AF]'}`}></span>
                        <span>{isOnline ? 'Online' : 'Offline'}</span>
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-[#9CA3AF] border-t border-white/5 pt-3">
                      <div className="flex justify-between">
                        <span>OS:</span>
                        <span className="text-[#F3F4F6] font-medium">{device.osName || 'Windows'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Agent Version:</span>
                        <span className="text-[#F3F4F6] font-medium">{device.agentVersion || 'v1.5.0'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleConnectDevice(device.deviceId)}
                      disabled={!isOnline}
                      className="w-full bg-gradient-to-r from-[#22C55E] to-[#06B6D4] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(6,182,212,0.3)] text-white font-bold py-3 rounded-xl transition-all duration-150 ease-out shadow-md disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center space-x-2 text-sm active:scale-98"
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
