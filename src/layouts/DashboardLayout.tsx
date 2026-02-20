import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';

export const DashboardLayout: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white shadow-xl md:shadow-none transition-transform duration-300 md:translate-x-0">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col md:pl-64 transition-all duration-300">
        <Header />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-7xl animate-in fade-in zoom-in duration-500">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
