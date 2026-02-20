import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Bell, LogOut, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-sm px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="md:hidden -ml-2 p-2 text-slate-500 hover:text-slate-900 focus:outline-none"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </button>
        <h2 className="text-lg font-semibold text-slate-800">
          Welcome back, {user?.name.split(' ')[0]}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="relative text-slate-500 hover:text-slate-900">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </Button>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <img
            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}`}
            alt="Avatar"
            className="h-8 w-8 rounded-full border border-slate-200"
          />
          <div className="hidden md:block">
            <p className="text-sm font-medium text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.role}</p>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={logout} className="ml-2 text-slate-500 hover:text-red-600">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};
