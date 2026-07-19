import React, { useState } from 'react';
import { Settings, ShieldAlert, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const [retentionDays, setRetentionDays] = useState('30');
  const [loading, setLoading] = useState(false);

  const handleClearLogs = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Are you sure you want to delete all logs and error records older than ${retentionDays} days? This action is permanent.`)) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/logs/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ days: parseInt(retentionDays, 10) })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to clear logs');

      alert(`Cleanup finished. Deleted ${data.eventsDeleted} event logs and ${data.errorsDeleted} error logs.`);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-100">Global Settings</h2>
        <p className="text-sm text-slate-400 mt-1">Configure global agent policies, connection thresholds, and database maintenance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DB Cleanup / Retention Panel */}
        <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl p-6">
          <h3 className="font-semibold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2 text-sm mb-4">
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Database Maintenance & Purging</span>
          </h3>

          <form onSubmit={handleClearLogs} className="space-y-4">
            <p className="text-xs text-slate-400">
              Clear historical events and error records to keep the database size within MongoDB Atlas free tier limits. Log retention applies to both event logs and agent crashes.
            </p>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Log Retention Period (Days)</label>
              <select
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="7">Older than 7 days</option>
                <option value="15">Older than 15 days</option>
                <option value="30">Older than 30 days</option>
                <option value="90">Older than 90 days</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center space-x-1 disabled:opacity-50"
            >
              <span>Execute Database Purge</span>
            </button>
          </form>
        </div>

        {/* Global Connection Policies */}
        <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl p-6">
          <h3 className="font-semibold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2 text-sm mb-4">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <span>Signaling Policies</span>
          </h3>

          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center py-2.5 border-b border-slate-900">
              <span className="text-slate-400">Heartbeat Interval:</span>
              <span className="text-slate-200 font-semibold">5 Seconds (Locked)</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-slate-900">
              <span className="text-slate-400">Agent Timeout Threshold:</span>
              <span className="text-slate-200 font-semibold">15 Seconds (Offline status trigger)</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-slate-900">
              <span className="text-slate-400">Session Reconnect Window:</span>
              <span className="text-slate-200 font-semibold">12 Hours (Reconnect timeout limit)</span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-slate-400">Max WebRTC Bitrate:</span>
              <span className="text-slate-200 font-semibold">Unlimited (Adaptive bitrate client side)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
