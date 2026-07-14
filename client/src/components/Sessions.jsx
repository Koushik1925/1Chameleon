import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Ban, Zap, AlertTriangle, Monitor, Code, Video } from 'lucide-react';
import StealthViewer from './StealthViewer';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);

    // Socket.IO real-time telemetry stream listener
    const socket = io('https://chameleon-1.onrender.com');
    socket.emit('join:admin');

    socket.on('session:data', (data) => {
      setSessions(prev => 
        prev.map(s => {
          if (s.sessionId === data.sessionId) {
            return {
              ...s,
              fps: data.fps,
              bitrate: data.bitrate,
              latency: data.latency,
              packetLoss: data.packetLoss,
              resolution: data.resolution
            };
          }
          return s;
        })
      );
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/admin/sessions', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminate = async (sessionId) => {
    if (!window.confirm(`Force close remote session ${sessionId}? This will disconnect both peer nodes.`)) return;

    setActionLoading(sessionId);
    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}/terminate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error('Failed to terminate session');
      await fetchSessions();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const activeSessions = sessions.filter(s => s.status === 'active');
  const pastSessions = sessions.filter(s => s.status !== 'active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-100">Live Peer Connections</h2>
        <p className="text-sm text-slate-400 mt-1">Real-time WebRTC streams, latency logs, and session pairing records</p>
      </div>

      {/* Active Streams Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Active Sessions ({activeSessions.length})</h3>
        
        {loading ? (
          <div className="text-slate-500 text-sm">Loading active connections...</div>
        ) : activeSessions.length === 0 ? (
          <div className="p-6 bg-slate-950/20 border border-slate-900 rounded-2xl text-center text-slate-500 text-sm">
            No active remote sessions currently running.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {activeSessions.map((session) => (
              <div key={session.sessionId} className="bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl p-6 space-y-4 relative glow-cyan">
                {/* Session Header */}
                <div className="flex justify-between items-start border-b border-slate-900 pb-3">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500 uppercase tracking-wider">Session Token</span>
                    <span className="text-lg font-bold text-slate-200">{session.sessionId}</span>
                  </div>
                  <button
                    onClick={() => handleTerminate(session.sessionId)}
                    disabled={actionLoading === session.sessionId}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-lg text-xs font-semibold uppercase tracking-wide transition-colors"
                  >
                    Force Terminate
                  </button>
                </div>

                {/* Session Body */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  {/* Bitrate */}
                  <div className="bg-slate-900/30 p-3 rounded-xl border border-slate-900">
                    <span className="text-[10px] text-slate-500 uppercase block tracking-wider">Bitrate</span>
                    <span className="text-sm font-bold text-cyan-400">
                      {session.bitrate ? `${(session.bitrate / 1000).toFixed(1)} Mbps` : 'Calculating...'}
                    </span>
                  </div>
                  {/* Latency */}
                  <div className="bg-slate-900/30 p-3 rounded-xl border border-slate-900">
                    <span className="text-[10px] text-slate-500 uppercase block tracking-wider">Latency</span>
                    <span className="text-sm font-bold text-rose-400">
                      {session.latency ? `${session.latency} ms` : 'Syncing...'}
                    </span>
                  </div>
                  {/* FPS */}
                  <div className="bg-slate-900/30 p-3 rounded-xl border border-slate-900">
                    <span className="text-[10px] text-slate-500 uppercase block tracking-wider">Framerate</span>
                    <span className="text-sm font-bold text-purple-400">
                      {session.fps ? `${session.fps} FPS` : 'Reading...'}
                    </span>
                  </div>
                  {/* Packet Loss */}
                  <div className="bg-slate-900/30 p-3 rounded-xl border border-slate-900">
                    <span className="text-[10px] text-slate-500 uppercase block tracking-wider">Loss Rate</span>
                    <span className="text-sm font-bold text-yellow-400">
                      {session.packetLoss !== undefined ? `${session.packetLoss}%` : '0.0%'}
                    </span>
                  </div>
                </div>

                {/* Session Meta */}
                <div className="text-xs text-slate-400 space-y-2 border-t border-slate-900 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center"><Monitor className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> Host ID:</span>
                    <span className="text-slate-200 font-mono">{session.deviceId}</span>
                  </div>
                  {session.sessionCode && (
                    <div className="flex justify-between items-center">
                      <span className="flex items-center"><Zap className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> Pairing Code:</span>
                      <span className="text-cyan-400 font-bold tracking-wider">{session.sessionCode}</span>
                    </div>
                  )}
                  {session.resolution && (
                    <div className="flex justify-between items-center">
                      <span className="flex items-center"><Video className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> Format:</span>
                      <span className="text-slate-200 font-medium">{session.resolution} @ {session.codec || 'H264'}</span>
                    </div>
                  )}
                  {session.clientLink && (
                    <div className="flex justify-between items-center border-t border-slate-900/50 pt-2">
                      <span className="text-slate-500">Pairing Link:</span>
                      <a href={session.clientLink} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline font-mono truncate max-w-[200px]">
                        {session.clientLink}
                      </a>
                    </div>
                  )}
                </div>
                
                {/* Stealth Observability Panel */}
                <StealthViewer sessionId={session.sessionId} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Sessions Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Connection History</h3>
        <div className="bg-slate-950/40 backdrop-blur-xl border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Loading historical data...</div>
          ) : pastSessions.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No historical sessions recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-950/60">
                    <th className="px-6 py-4">Session Token</th>
                    <th className="px-6 py-4">Host Device</th>
                    <th className="px-6 py-4">Session Code</th>
                    <th className="px-6 py-4">Connection Type</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4">Start Time</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-sm text-slate-300">
                  {pastSessions.map((session) => (
                    <tr key={session._id} className="hover:bg-slate-900/10 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-slate-200">{session.sessionId}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">{session.deviceId}</td>
                      <td className="px-6 py-4 text-cyan-400 font-bold">{session.sessionCode || 'N/A'}</td>
                      <td className="px-6 py-4 text-xs font-medium">{session.connectionType || 'WebRTC'}</td>
                      <td className="px-6 py-4 text-xs">
                        {session.duration ? `${Math.floor(session.duration / 60)}m ${session.duration % 60}s` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(session.startTime).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-semibold border ${
                          session.status === 'completed' 
                            ? 'bg-slate-900 text-slate-400 border-slate-800' 
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {session.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
