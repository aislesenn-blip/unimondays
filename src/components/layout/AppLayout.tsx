import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export const AppLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300">
      {/* Sidebar for Desktop (Already has hidden md:flex inside) */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="md:pl-64 min-h-screen pb-20 md:pb-0 transition-all duration-300">
        <div className="max-w-4xl mx-auto px-4 py-6 md:px-8 md:py-8 w-full">
          <Outlet />
        </div>
      </main>

      {/* Bottom Nav for Mobile (Already has md:hidden inside) */}
      <BottomNav />
    </div>
  );
};
