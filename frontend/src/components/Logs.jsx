import React, { useState, useEffect } from 'react';
import { Terminal, Filter, ArrowLeft, ArrowRight, ShieldAlert } from 'lucide-react';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [severityFilter, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const severityParam = severityFilter !== 'all' ? `&severity=${severityFilter}` : '';
      const response = await fetch(`/api/admin/logs?limit=30&page=${page}${severityParam}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      
      setLogs(data.logs || []);
      setTotalPages(data.pages || 1);
      setTotalLogs(data.total || 0);
    } catch (err) {
      console.error('Error fetching logs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSeverityChange = (severity) => {
    setSeverityFilter(severity);
    setPage(1); // Reset to page 1 on filter change
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-100">Audit Logs</h2>
          <p className="text-sm text-slate-400 mt-1">Live database of server actions, signaling logs, and system events</p>
        </div>

        {/* Severity Filters */}
        <div className="flex items-center space-x-2 self-start">
          <Filter className="w-4 h-4 text-slate-500 mr-1" />
          {['all', 'info', 'warning', 'error', 'critical'].map((sev) => (
            <button
              key={sev}
              onClick={() => handleSeverityChange(sev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all duration-200 ${
                severityFilter === sev
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                  : 'bg-slate-950/20 text-slate-400 border-slate-900 hover:text-slate-300'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-950/40 backdrop-blur-xl border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading system logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No log entries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-950/60">
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Event Type</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Device ID</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-sm text-slate-300">
                {logs.map((log) => {
                  const severityBadgeColor = 
                    log.severity === 'critical' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                    log.severity === 'error' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
                    log.severity === 'warning' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                    'text-blue-400 bg-blue-500/10 border-blue-500/20';

                  return (
                    <tr key={log._id} className="hover:bg-slate-900/10 transition-colors">
                      {/* Severity */}
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${severityBadgeColor}`}>
                          {log.severity}
                        </span>
                      </td>

                      {/* Event Type */}
                      <td className="px-6 py-4 font-semibold text-slate-200 text-xs uppercase tracking-wide">
                        {log.eventType}
                      </td>

                      {/* Description */}
                      <td className="px-6 py-4 text-xs text-slate-300 max-w-xs truncate" title={log.description}>
                        {log.description}
                      </td>

                      {/* Device ID */}
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {log.deviceId ? log.deviceId : <span className="text-slate-700">N/A</span>}
                      </td>

                      {/* Timestamp */}
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-slate-950/20 px-6 py-3 border border-slate-900 rounded-xl text-xs text-slate-400">
          <span>Showing Page {page} of {totalPages} ({totalLogs} total entries)</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 disabled:opacity-40"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
