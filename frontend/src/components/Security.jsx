import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertOctagon, Key, Trash2, ShieldCheck, HelpCircle } from 'lucide-react';

export default function Security() {
  const [bannedDevices, setBannedDevices] = useState([]);
  const [failedLogins, setFailedLogins] = useState([]);
  const [fingerprintAlerts, setFingerprintAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      
      // Fetch devices to extract banned ones
      const devicesResponse = await fetch('/api/admin/devices', { headers });
      const devices = await devicesResponse.json();
      setBannedDevices(devices.filter(d => d.status === 'banned') || []);

      // Fetch logs to extract failed login attempts and fingerprint alerts
      const logsResponse = await fetch('/api/admin/logs?limit=250', { headers });
      const data = await logsResponse.json();
      const logs = data.logs || [];

      setFailedLogins(logs.filter(l => l.eventType === 'Failed Login Attempt'));
      setFingerprintAlerts(logs.filter(l => l.eventType === 'Security Fingerprint Match'));

    } catch (err) {
      console.error('Error fetching security logs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async (deviceId) => {
    if (!window.confirm(`Restore access for device ${deviceId}?`)) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/devices/${deviceId}/unban`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error('Failed to unban device');
      await fetchSecurityData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-100">Security Control Center</h2>
        <p className="text-sm text-slate-400 mt-1">Audit active bans, review hardware fingerprint matches, and track authentication failures</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Banned Devices List */}
        <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl p-6">
          <h3 className="font-semibold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2 text-sm mb-4">
            <AlertOctagon className="w-4 h-4 text-red-500" />
            <span>Active Hardware Fingerprint Bans ({bannedDevices.length})</span>
          </h3>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {bannedDevices.map((device) => (
              <div key={device.deviceId} className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-300 text-sm">{device.hostname || 'Unknown'}</span>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5">{device.deviceId}</span>
                  </div>
                  <button
                    onClick={() => handleUnban(device.deviceId)}
                    disabled={actionLoading}
                    className="px-2.5 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300 border border-green-500/20 rounded text-[10px] uppercase font-semibold transition-colors"
                  >
                    Unban
                  </button>
                </div>
                <div className="text-slate-400 space-y-1">
                  <p><span className="font-semibold text-slate-500">Ban Reason:</span> {device.ban?.reason}</p>
                  <p><span className="font-semibold text-slate-500">Authorized By:</span> {device.ban?.bannedBy || 'System'}</p>
                  <p><span className="font-semibold text-slate-500">Banned On:</span> {new Date(device.ban?.bannedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {bannedDevices.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-500 flex flex-col items-center justify-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-slate-600" />
                <p>No active device bans enforced.</p>
              </div>
            )}
          </div>
        </div>

        {/* Fingerprint Matches & Warnings */}
        <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl p-6">
          <h3 className="font-semibold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2 text-sm mb-4">
            <ShieldAlert className="w-4 h-4 text-orange-500" />
            <span>Fingerprint Cloning & Ban Alerts ({fingerprintAlerts.length})</span>
          </h3>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {fingerprintAlerts.map((alert) => (
              <div key={alert._id} className="p-3.5 bg-orange-500/5 border border-orange-500/10 rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-orange-400">HARDWARE MATCH DETECTED</span>
                  <span className="text-[10px] text-slate-500">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-slate-300">{alert.description}</p>
                <div className="text-[10px] text-slate-500 font-mono">
                  Target Device ID: {alert.deviceId}
                </div>
              </div>
            ))}
            {fingerprintAlerts.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-500 flex flex-col items-center justify-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-slate-600" />
                <p>No fingerprint cloning attempts detected.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Failed Login Attempts */}
      <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl p-6">
        <h3 className="font-semibold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2 text-sm mb-4">
          <Key className="w-4 h-4 text-cyan-400" />
          <span>Failed Authentication Logs ({failedLogins.length})</span>
        </h3>

        <div className="divide-y divide-slate-900 max-h-[300px] overflow-y-auto pr-1">
          {failedLogins.map((attempt) => (
            <div key={attempt._id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex flex-col space-y-1">
                <span className="font-semibold text-slate-300">{attempt.description}</span>
                <span className="text-slate-500">{new Date(attempt.timestamp).toLocaleString()}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[8px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 uppercase font-semibold">
                Access Denied
              </span>
            </div>
          ))}
          {failedLogins.length === 0 && (
            <p className="text-center text-xs text-slate-500 py-6">No authentication failures recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}
