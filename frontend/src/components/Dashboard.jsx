import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, LineChart, Line, CartesianGrid 
} from 'recharts';
import { Monitor, Play, Cpu, AlertTriangle, Terminal, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    activeSessions: 0,
    pendingUpdates: 0,
    bannedDevices: 0
  });

  const [liveTelemetry, setLiveTelemetry] = useState([]);
  const [liveSessionsData, setLiveSessionsData] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    // 1. Fetch initial statistics and logs
    fetchStats();
    fetchRecentLogs();

    // 2. Establish Socket.IO listener for live telemetry streams
    const socket = io('https://chameleon-j5wf.onrender.com');
    socket.emit('join:admin');

    socket.on('telemetry:data', (data) => {
      // Keep only last 20 telemetry entries
      setLiveTelemetry(prev => {
        const updated = [...prev, {
          time: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          cpu: data.cpuUsage,
          ram: data.ramUsage
        }];
        return updated.slice(-20);
      });
    });

    socket.on('session:data', (data) => {
      // Keep only last 20 WebRTC data points
      setLiveSessionsData(prev => {
        const updated = [...prev, {
          time: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          bitrate: +(data.bitrate / 1000).toFixed(1), // convert to mbps
          latency: data.latency,
          loss: data.packetLoss
        }];
        return updated.slice(-20);
      });

      // Increment active sessions count dynamically if new session appears
      fetchStats(); 
    });

    // Refresh dashboard stats periodically
    const interval = setInterval(fetchStats, 10000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      
      const devicesResponse = await fetch('/api/admin/devices', { headers });
      const devices = await devicesResponse.json();
      
      const sessionsResponse = await fetch('/api/admin/sessions', { headers });
      const sessions = await sessionsResponse.json();

      const versionsResponse = await fetch('/api/admin/versions', { headers });
      const versions = await versionsResponse.json();

      const stableVersion = versions.find(v => v.isStable)?.version || '';

      const totalDevices = devices.length;
      const bannedDevices = devices.filter(d => d.status === 'banned').length;
      
      // Device is considered online if seen in past 15 seconds
      const onlineDevices = devices.filter(d => 
        d.status !== 'banned' && 
        new Date() - new Date(d.lastSeen) < 15000
      ).length;

      const activeSessions = sessions.filter(s => s.status === 'active').length;
      
      const pendingUpdates = devices.filter(d => 
        d.status !== 'banned' && 
        d.agentVersion !== stableVersion
      ).length;

      setStats({
        totalDevices,
        onlineDevices,
        activeSessions,
        pendingUpdates,
        bannedDevices
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err.message);
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const response = await fetch('/api/admin/logs?limit=5', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setRecentLogs(data.logs || []);
    } catch (err) {
      console.error('Error fetching recent logs:', err.message);
    }
  };

  const statCards = [
    { name: 'Online Agents', value: stats.onlineDevices, total: stats.totalDevices, label: 'Devices active', icon: Monitor, color: 'text-green-400', bg: 'bg-green-500/10' },
    { name: 'Active Sessions', value: stats.activeSessions, label: 'Live peer streams', icon: Play, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { name: 'Updates Pending', value: stats.pendingUpdates, label: 'Require upgrade', icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { name: 'Banned Devices', value: stats.bannedDevices, label: 'Fingerprint blocked', icon: Cpu, color: 'text-red-400', bg: 'bg-red-500/10' }
  ];

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-100">Operational Overview</h2>
          <p className="text-sm text-slate-400 mt-1">Real-time statistics of the Chameleon signaling networks</p>
        </div>
        <div className="flex items-center space-x-2 bg-slate-950 border border-slate-900 px-4 py-2 rounded-xl">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Simulator: Active</span>
        </div>
      </div>

      {/* Grid of Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{card.name}</span>
                <div className={`p-2.5 rounded-lg ${card.bg} ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-bold text-slate-100 tracking-tight">
                  {card.value}
                  {card.total !== undefined && <span className="text-sm font-normal text-slate-500">/{card.total}</span>}
                </span>
                <p className="text-xs text-slate-500 mt-1">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time CPU/RAM Telemetry */}
        <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-semibold text-slate-200">Real-time Agent Telemetry</h3>
              <p className="text-xs text-slate-500 mt-0.5">Average CPU & RAM load streamed from simulator</p>
            </div>
            <span className="text-[10px] text-cyan-400 font-semibold tracking-widest uppercase bg-cyan-500/10 px-2.5 py-1 rounded-full animate-pulse">Live</span>
          </div>

          <div className="h-72">
            {liveTelemetry.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-500">
                Waiting for incoming heartbeat telemetry...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={liveTelemetry} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d8ff" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#00d8ff" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} />
                  <Area type="monotone" dataKey="cpu" name="CPU Usage %" stroke="#00d8ff" fillOpacity={1} fill="url(#colorCpu)" />
                  <Area type="monotone" dataKey="ram" name="RAM Usage %" stroke="#a855f7" fillOpacity={1} fill="url(#colorRam)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Live WebRTC Bitrate/Latency */}
        <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-semibold text-slate-200">WebRTC Direct Stream Performance</h3>
              <p className="text-xs text-slate-500 mt-0.5">Live bitrate (Mbps) and frame transmission latency (ms)</p>
            </div>
            <span className="text-[10px] text-cyan-400 font-semibold tracking-widest uppercase bg-cyan-500/10 px-2.5 py-1 rounded-full animate-pulse">Live</span>
          </div>

          <div className="h-72">
            {liveSessionsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-500">
                Start a session in the simulator to stream WebRTC statistics.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={liveSessionsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} />
                  <Line type="monotone" dataKey="bitrate" name="Bitrate (Mbps)" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="latency" name="Latency (ms)" stroke="#f43f5e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Logs & Alerts */}
      <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-semibold text-slate-200">Recent Security Alerts & Events</h3>
            <p className="text-xs text-slate-500 mt-0.5">Latest system events from the audit log</p>
          </div>
          <Link to="/logs" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-1">
            <span>View All Logs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-900">
          {recentLogs.map((log) => {
            const severityColor = 
              log.severity === 'critical' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
              log.severity === 'warning' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
              'text-blue-400 bg-blue-500/10 border-blue-500/20';

            return (
              <div key={log._id} className="py-3 flex items-center justify-between text-sm">
                <div className="flex items-center space-x-3 truncate">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${severityColor}`}>
                    {log.severity}
                  </span>
                  <span className="text-slate-300 truncate">{log.description}</span>
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0 ml-4">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            );
          })}
          {recentLogs.length === 0 && (
            <div className="py-6 text-center text-sm text-slate-500">
              No recent audit log entries available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
