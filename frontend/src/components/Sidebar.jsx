import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Monitor, Play, FileDown, 
  ShieldAlert, Terminal, Settings, LogOut, ShieldAlert as Shield
} from 'lucide-react';

export default function Sidebar({ onLogout, username }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Devices', path: '/devices', icon: Monitor },
    { name: 'Live Sessions', path: '/sessions', icon: Play },
    { name: 'Downloads & Releases', path: '/downloads', icon: FileDown },
    { name: 'Security Center', path: '/security', icon: ShieldAlert },
    { name: 'System Logs', path: '/logs', icon: Terminal },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-950/60 backdrop-blur-xl border-r border-slate-900 flex flex-col justify-between h-screen sticky top-0">
      <div className="flex flex-col">
        {/* Brand Logo */}
        <div className="p-6 border-b border-slate-900 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-slate-200">CHAMELEON</h1>
            <span className="text-[10px] text-cyan-400 font-medium tracking-widest uppercase">Admin Panel</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => 
                  `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-500' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Session Footer */}
      <div className="p-4 border-t border-slate-900">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900/30 rounded-lg mb-2">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400">Logged in as</span>
            <span className="text-sm font-medium text-slate-200 truncate max-w-[120px]">{username || 'Admin'}</span>
          </div>
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
