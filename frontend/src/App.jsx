import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Devices from './components/Devices';
import DeviceDetail from './components/DeviceDetail';
import Sessions from './components/Sessions';
import Downloads from './components/Downloads';
import Security from './components/Security';
import Logs from './components/Logs';
import SettingsPage from './components/Settings';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If token is invalid or missing, redirect to login
    if (!token && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [token, location.pathname, navigate]);

  const handleLoginSuccess = (newToken, user) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', user);
    setToken(newToken);
    setUsername(user);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken('');
    setUsername('');
  };

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex bg-[#05060b] min-h-screen text-slate-100 font-sans">
      {/* Sidebar Panel */}
      <Sidebar onLogout={handleLogout} username={username} />

      {/* Main Panel Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-screen">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/devices/:id" element={<DeviceDetail />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/security" element={<Security />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/settings" element={<SettingsPage />} />
          
          {/* Fallbacks */}
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<div className="p-8 text-center bg-slate-900/10 border border-slate-900 rounded-2xl">404 - View Not Found</div>} />
        </Routes>
      </main>
    </div>
  );
}
