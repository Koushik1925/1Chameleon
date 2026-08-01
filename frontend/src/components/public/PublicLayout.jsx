import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';
import { initAnalytics } from '../../seo/analytics';

export default function PublicLayout() {
  const location = useLocation();

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    // Initialize search console / GA4 / clarity scripts if env provided
    initAnalytics();
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#05060b] text-slate-100 font-sans flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navbar */}
      <PublicNavbar />

      {/* Main Content Area */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
