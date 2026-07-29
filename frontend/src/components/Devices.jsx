import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, AlertTriangle, CheckCircle, Ban, Trash2 } from 'lucide-react';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showUnknown, setShowUnknown] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 5000);
    return () => clearInterval(interval);
  }, [showUnknown]);

  const fetchDevices = async () => {
    try {
      const url = showUnknown ? '/api/admin/devices?includeUnknown=true' : '/api/admin/devices';
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setDevices(data || []);
    } catch (err) {
      console.error('Error fetching devices:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeUnknown = async () => {
    if (!window.confirm('Are you sure you want to purge all temporary/unknown socket records?')) return;
    try {
      const response = await fetch('/api/admin/devices/cleanup-unknown', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      alert(data.message || 'Unknown records cleaned up');
      fetchDevices();
    } catch (err) {
      console.error('Error cleaning up unknown devices:', err.message);
    }
  };

  const getStatusBadge = (device) => {
    const isOnline = new Date() - new Date(device.lastSeen) < 15000;
    
    if (device.status === 'banned') {
      return (
        <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
          <Ban className="w-3 h-3" />
          <span>Banned</span>
        </span>
      );
    }

    if (device.status === 'suspended') {
      return (
        <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
          <AlertTriangle className="w-3 h-3" />
          <span>Suspended</span>
        </span>
      );
    }

    if (isOnline) {
      return (
        <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
          <CheckCircle className="w-3 h-3" />
          <span>Online</span>
        </span>
      );
    }

    return (
      <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-slate-400 border border-slate-800">
        <CheckCircle className="w-3 h-3" />
        <span>Offline</span>
      </span>
    );
  };

  const filteredDevices = devices.filter(d => {
    const isOnline = new Date() - new Date(d.lastSeen) < 15000;
    const matchesSearch = 
      d.hostname?.toLowerCase().includes(search.toLowerCase()) ||
      d.deviceId?.toLowerCase().includes(search.toLowerCase()) ||
      d.publicIp?.includes(search);

    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'banned') return d.status === 'banned' && matchesSearch;
    if (statusFilter === 'online') return d.status === 'active' && isOnline && matchesSearch;
    if (statusFilter === 'offline') return d.status === 'active' && !isOnline && matchesSearch;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-100">Registered Devices</h2>
          <p className="text-sm text-slate-400 mt-1">List of all active, suspended, and hardware fingerprint banned agents</p>
        </div>
        <button
          onClick={handlePurgeUnknown}
          className="flex items-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>Purge Unknown Records</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Search devices by hostname, Device ID, IP address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/40 border border-slate-900 rounded-xl pl-11 pr-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="flex space-x-2">
          {['all', 'online', 'offline', 'banned'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all duration-200 ${
                statusFilter === filter
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                  : 'bg-slate-950/20 text-slate-400 border-slate-900 hover:text-slate-300'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-slate-950/40 backdrop-blur-xl border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Fetching registered agent devices...
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No devices matched the specified search and filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-950/60">
                  <th className="px-6 py-4">Hostname / ID</th>
                  <th className="px-6 py-4">IP / Geo Location</th>
                  <th className="px-6 py-4">Operating System</th>
                  <th className="px-6 py-4">Agent Version</th>
                  <th className="px-6 py-4">Last Seen</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-sm text-slate-300">
                {filteredDevices.map((device) => {
                  const isOnline = new Date() - new Date(device.lastSeen) < 15000;
                  return (
                    <tr key={device.deviceId} className="hover:bg-slate-900/10 transition-colors">
                      {/* Hostname / ID */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-200">{device.hostname || 'Unknown'}</span>
                          <span className="text-[10px] text-slate-500 font-mono tracking-widest">{device.deviceId}</span>
                        </div>
                      </td>

                      {/* IP / Location */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-slate-300">{device.publicIp || 'N/A'}</span>
                          <span className="text-xs text-slate-500">
                            {device.country ? `${device.country} (${device.region || 'N/A'})` : 'GeoIP Pending'}
                          </span>
                        </div>
                      </td>

                      {/* OS */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span>{device.osName || 'Windows'}</span>
                          <span className="text-xs text-slate-500">{device.osVersion || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Version */}
                      <td className="px-6 py-4 text-xs font-mono">{device.agentVersion || 'N/A'}</td>

                      {/* Last Seen */}
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {isOnline ? (
                          <span className="text-green-400 font-medium">Just now</span>
                        ) : (
                          new Date(device.lastSeen).toLocaleString()
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          {getStatusBadge(device)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/devices/${device.deviceId}`}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-cyan-400 rounded-lg transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Manage</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
