import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { 
  ArrowLeft, Ban, CheckCircle, RefreshCw, Cpu, 
  Terminal, ShieldAlert, Zap, Globe, Layers, AlertCircle 
} from 'lucide-react';

export default function DeviceDetail() {
  const { id } = useParams();
  const [device, setDevice] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [banReason, setBanReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Live telemetry state for this specific device
  const [liveHealth, setLiveHealth] = useState({
    cpu: 0, ram: 0, disk: 0, uptime: 0
  });

  useEffect(() => {
    fetchDeviceDetails();
    
    // Live update polling
    const interval = setInterval(fetchDeviceDetails, 8000);

    // Socket listener for real-time telemetry streaming
    const socket = io('https://chameleon-1.onrender.com');
    socket.emit('join:admin');

    socket.on('telemetry:data', (data) => {
      if (data.deviceId === id) {
        setLiveHealth({
          cpu: data.cpuUsage,
          ram: data.ramUsage,
          disk: data.diskUsage,
          uptime: data.agentUptime
        });
      }
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [id]);

  const fetchDeviceDetails = async () => {
    try {
      const response = await fetch(`/api/admin/devices/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Device not found');
      const data = await response.json();
      
      setDevice(data.device);
      setSessions(data.sessions || []);
      setLogs(data.logs || []);

      // If we don't have socket telemetry yet, fallback to database health stats
      if (data.device?.health) {
        setLiveHealth(prev => ({
          cpu: prev.cpu || data.device.health.cpuUsage || 0,
          ram: prev.ram || data.device.health.ramUsage || 0,
          disk: data.device.health.diskUsage || 0,
          uptime: data.device.health.agentUptime || 0
        }));
      }
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Are you absolutely sure you want to BAN device ${id}? This will block its hardware fingerprint.`)) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/devices/${id}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason: banReason })
      });

      if (!response.ok) throw new Error('Failed to ban device');
      await fetchDeviceDetails();
      setBanReason('');
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnban = async () => {
    if (!window.confirm(`Unban device ${id}?`)) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/devices/${id}/unban`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error('Failed to unban device');
      await fetchDeviceDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendCommand = async (type) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/devices/${id}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ type })
      });

      const data = await response.json();
      alert(data.message);
      fetchDeviceDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8 text-slate-500 text-sm">Loading device specifications...</div>;
  }

  if (!device) {
    return (
      <div className="space-y-4">
        <Link to="/devices" className="inline-flex items-center space-x-2 text-sm text-cyan-400 hover:underline">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Devices</span>
        </Link>
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl">
          Device specifications not found.
        </div>
      </div>
    );
  }

  const isOnline = new Date() - new Date(device.lastSeen) < 15000;

  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="space-y-2">
          <Link to="/devices" className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-500 hover:text-cyan-400 uppercase tracking-widest transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Device List</span>
          </Link>
          <div className="flex items-center space-x-3">
            <h2 className="text-3xl font-bold text-slate-100 tracking-tight">{device.hostname || 'Device Specs'}</h2>
            {device.status === 'banned' ? (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wide">Banned</span>
            ) : isOnline ? (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-wide animate-pulse">Online</span>
            ) : (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-slate-400 border border-slate-800 uppercase tracking-wide">Offline</span>
            )}
          </div>
          <p className="text-xs font-mono text-slate-500 tracking-wider">Device ID: {device.deviceId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Specs & Ban Management */}
        <div className="space-y-6 lg:col-span-1">
          {/* Spec details card */}
          <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2 text-sm">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Agent Specifications</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 uppercase tracking-wider block">OS Platform</span>
                <span className="text-slate-200 text-sm font-medium">{device.osName} ({device.osVersion})</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 uppercase tracking-wider block">Agent Version</span>
                  <span className="text-slate-200 font-mono">{device.agentVersion}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase tracking-wider block">Last Active</span>
                  <span className="text-slate-200">{new Date(device.lastSeen).toLocaleTimeString()}</span>
                </div>
              </div>
              <div className="border-t border-slate-900 pt-3">
                <span className="text-slate-500 uppercase tracking-wider block">Public IP Address</span>
                <span className="text-slate-200 text-sm font-medium flex items-center space-x-1">
                  <Globe className="w-3.5 h-3.5 text-slate-500 mr-1" />
                  <span>{device.publicIp}</span>
                </span>
                <span className="text-slate-500 block mt-0.5">{device.country} - {device.region}</span>
              </div>

              {/* Hardware Fingerprinting */}
              <div className="border-t border-slate-900 pt-3 space-y-2">
                <span className="text-slate-500 uppercase tracking-wider block font-semibold">Hardware Fingerprints</span>
                <div>
                  <span className="text-slate-500 block">Machine GUID</span>
                  <span className="text-slate-300 font-mono break-all">{device.machineGuid || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Installation ID</span>
                  <span className="text-slate-300 font-mono break-all">{device.installationId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Fingerprint Hash</span>
                  <span className="text-slate-300 font-mono break-all">{device.fingerprintHash || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ban/Suspension Panel */}
          <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl p-6">
            <h3 className="font-semibold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2 text-sm mb-4">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span>Access Restriction Control</span>
            </h3>

            {device.status === 'banned' ? (
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs space-y-2">
                  <p className="font-bold flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>DEVICE HARDWARE BANNED</span>
                  </p>
                  <p><span className="font-semibold">Reason:</span> {device.ban?.reason}</p>
                  <p><span className="font-semibold">Banned On:</span> {new Date(device.ban?.bannedAt).toLocaleString()}</p>
                  <p><span className="font-semibold">Banned By:</span> {device.ban?.bannedBy}</p>
                </div>
                <button
                  onClick={handleUnban}
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  Unban & Restore Agent
                </button>
              </div>
            ) : (
              <form onSubmit={handleBan} className="space-y-4">
                <p className="text-xs text-slate-400">
                  Banning a device will disconnect all live sessions and prevent the agent from registering or connecting using its device ID or hardware fingerprints.
                </p>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Ban Reason</label>
                  <input
                    type="text"
                    required
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Enter violation reason..."
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-red-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-red-650 hover:bg-red-650/80 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center space-x-1"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Enforce Fingerprint Ban</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Health Gauges, Commands, & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Health Statistics */}
          <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl p-6">
            <h3 className="font-semibold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2 text-sm mb-6">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Real-Time Health Metrics</span>
            </h3>

            <div className="grid grid-cols-3 gap-6">
              {/* CPU Gauge */}
              <div className="flex flex-col items-center">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.02)" strokeWidth="8" fill="transparent" />
                    <circle cx="48" cy="48" r="40" stroke="#00d8ff" strokeWidth="8" fill="transparent"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * liveHealth.cpu) / 100}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <span className="absolute text-lg font-bold text-slate-200">{liveHealth.cpu}%</span>
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-2">CPU LOAD</span>
              </div>

              {/* RAM Gauge */}
              <div className="flex flex-col items-center">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.02)" strokeWidth="8" fill="transparent" />
                    <circle cx="48" cy="48" r="40" stroke="#a855f7" strokeWidth="8" fill="transparent"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * liveHealth.ram) / 100}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <span className="absolute text-lg font-bold text-slate-200">{liveHealth.ram}%</span>
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-2">RAM LOAD</span>
              </div>

              {/* Disk Gauge */}
              <div className="flex flex-col items-center">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.02)" strokeWidth="8" fill="transparent" />
                    <circle cx="48" cy="48" r="40" stroke="#10b981" strokeWidth="8" fill="transparent"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * liveHealth.disk) / 100}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <span className="absolute text-lg font-bold text-slate-200">{liveHealth.disk}%</span>
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-2">DISK LOAD</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-900 text-xs text-slate-400 flex justify-between">
              <span>Agent Uptime:</span>
              <span className="text-slate-200 font-semibold">
                {Math.floor(liveHealth.uptime / 3600)}h {Math.floor((liveHealth.uptime % 3600) / 60)}m
              </span>
            </div>
          </div>

          {/* Remote Action Commands */}
          <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl p-6">
            <h3 className="font-semibold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2 text-sm mb-4">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Remote Administrative Actions</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <button
                onClick={() => handleSendCommand('requestLogs')}
                disabled={actionLoading || !isOnline}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/20 rounded-xl text-xs font-medium text-slate-300 hover:text-cyan-400 transition-all flex flex-col items-center space-y-2 disabled:opacity-40"
              >
                <Terminal className="w-5 h-5" />
                <span>Pull System Logs</span>
              </button>

              <button
                onClick={() => handleSendCommand('restart')}
                disabled={actionLoading || !isOnline}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/20 rounded-xl text-xs font-medium text-slate-300 hover:text-cyan-400 transition-all flex flex-col items-center space-y-2 disabled:opacity-40"
              >
                <RefreshCw className="w-5 h-5 animate-spin-slow" />
                <span>Restart Agent</span>
              </button>

              <button
                onClick={() => handleSendCommand('refreshConfig')}
                disabled={actionLoading || !isOnline}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/20 rounded-xl text-xs font-medium text-slate-300 hover:text-cyan-400 transition-all flex flex-col items-center space-y-2 disabled:opacity-40"
              >
                <Layers className="w-5 h-5" />
                <span>Sync Configuration</span>
              </button>

              <button
                onClick={() => handleSendCommand('disconnect')}
                disabled={actionLoading || !isOnline}
                className="p-3 bg-slate-900 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/20 rounded-xl text-xs font-medium text-slate-300 hover:text-red-400 transition-all flex flex-col items-center space-y-2 disabled:opacity-40"
              >
                <Ban className="w-5 h-5" />
                <span>Force Stop Agent</span>
              </button>
            </div>
          </div>

          {/* Session History */}
          <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl p-6">
            <h3 className="font-semibold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2 text-sm mb-4">
              <CheckCircle className="w-4 h-4 text-cyan-400" />
              <span>Device Session Logs</span>
            </h3>

            <div className="space-y-3">
              {sessions.slice(0, 5).map((session) => (
                <div key={session._id} className="p-3 bg-slate-900/30 border border-slate-900 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex flex-col space-y-1">
                    <span className="font-semibold text-slate-300">Session ID: {session.sessionId}</span>
                    <span className="text-slate-500">{new Date(session.startTime).toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-semibold ${
                      session.status === 'active' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {session.status}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-1">
                      {session.duration ? `${session.duration}s` : 'Ongoing'}
                    </span>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="text-center text-xs text-slate-500 py-4">No pairing sessions logged for this device.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
