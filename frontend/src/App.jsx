// Chameleon — Main Application & SEO Router
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

// Public Layout & Public SEO Pages
import PublicLayout from './components/public/PublicLayout';
import HomePage from './pages/public/HomePage';
import FeaturesPage from './pages/public/FeaturesPage';
import DownloadPage from './pages/public/DownloadPage';
import PricingPage from './pages/public/PricingPage';
import HelpPage from './pages/public/HelpPage';
import FAQPage from './pages/public/FAQPage';
import BlogPage from './pages/public/BlogPage';
import BlogPostPage from './pages/public/BlogPostPage';
import SecurityPage from './pages/public/SecurityPage';
import PrivacyPage from './pages/public/PrivacyPage';
import TermsPage from './pages/public/TermsPage';
import CookiePage from './pages/public/CookiePage';
import ContactPage from './pages/public/ContactPage';
import DeleteAccountPage from './pages/public/DeleteAccountPage';
import ChangelogPage from './pages/public/ChangelogPage';
import DesktopAgentPage from './pages/public/DesktopAgentPage';
import NotFoundPage from './pages/public/NotFoundPage';

// Admin Panel Components
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
    navigate('/login');
  };

  // Helper for admin route guard
  const ProtectedAdminRoute = ({ children }) => {
    if (!token) {
      return <Navigate to="/login" replace />;
    }
    return (
      <div className="flex bg-[#05060b] min-h-screen text-slate-100 font-sans">
        <Sidebar onLogout={handleLogout} username={username} />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-screen">
          {children}
        </main>
      </div>
    );
  };

  return (
    <Routes>
      {/* Public SEO & Marketing Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/download" element={<DownloadPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/cookie-policy" element={<CookiePage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/delete-account" element={<DeleteAccountPage />} />
        <Route path="/desktop-agent" element={<DesktopAgentPage />} />
        <Route path="/changelog" element={<ChangelogPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Admin Login Route */}
      <Route 
        path="/login" 
        element={
          token ? <Navigate to="/dashboard" replace /> : <Login onLoginSuccess={handleLoginSuccess} />
        } 
      />

      {/* Protected Admin Routes */}
      <Route path="/dashboard" element={<ProtectedAdminRoute><Dashboard /></ProtectedAdminRoute>} />
      <Route path="/devices" element={<ProtectedAdminRoute><Devices /></ProtectedAdminRoute>} />
      <Route path="/devices/:id" element={<ProtectedAdminRoute><DeviceDetail /></ProtectedAdminRoute>} />
      <Route path="/sessions" element={<ProtectedAdminRoute><Sessions /></ProtectedAdminRoute>} />
      <Route path="/admin/downloads" element={<ProtectedAdminRoute><Downloads /></ProtectedAdminRoute>} />
      <Route path="/admin/security" element={<ProtectedAdminRoute><Security /></ProtectedAdminRoute>} />
      <Route path="/logs" element={<ProtectedAdminRoute><Logs /></ProtectedAdminRoute>} />
      <Route path="/settings" element={<ProtectedAdminRoute><SettingsPage /></ProtectedAdminRoute>} />
    </Routes>
  );
}
