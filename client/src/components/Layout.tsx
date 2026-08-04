import { MenuIcon } from 'lucide-react';
import Sidebar from '../components/Sidebar.tsx';
import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/accounts': 'Social Accounts',
  '/schedule': 'Post Scheduler',
  '/ai-composer': 'AI Composer',
};

const Layout = () => {
  const location = useLocation();

  const title = pageTitles[location.pathname] || 'SocialAI';

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 md:px-8 gap-4">
          <button
            className="md:hidden p-2 -ml-2 text-slate-500"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <MenuIcon className="size-6" />
          </button>

          <div>
            <h1 className="text-slate-900">{title}</h1>
            <p className="text-sm text-slate-400 hidden sm:block">
              Manage and automate your social presence
            </p>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 xl:p-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
