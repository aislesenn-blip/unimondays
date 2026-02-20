import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import {
  LayoutDashboard,
  FileText,
  Bell,
  Shield,
  Calendar,
  Users,
  X
} from 'lucide-react';
import type { Role } from '../types';
import { Button } from './ui/Button';

interface LinkItem {
  name: string;
  path: string;
  icon: React.ElementType;
  roles: Role[];
}

interface SidebarProps {
    onLinkClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLinkClick }) => {
  const { user } = useAuth();

  if (!user) return null;

  const links: LinkItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['HOD', 'SECRETARY', 'STAFF', 'COMMITTEE'] },
    { name: 'Requests', path: '/requests', icon: FileText, roles: ['HOD', 'SECRETARY', 'STAFF'] },
    { name: 'Notices', path: '/notices', icon: Bell, roles: ['HOD', 'SECRETARY', 'STAFF', 'COMMITTEE'] },
    { name: 'Vault', path: '/vault', icon: Shield, roles: ['HOD', 'SECRETARY', 'STAFF', 'COMMITTEE'] },
    { name: 'Calendar', path: '/calendar', icon: Calendar, roles: ['SECRETARY'] },
    { name: 'Committee', path: '/committee', icon: Users, roles: ['COMMITTEE', 'HOD'] },
  ];

  const filteredLinks = links.filter(link => link.roles.includes(user.role));

  const LinkIcon = ({ icon: Icon, className }: { icon: React.ElementType, className?: string }) => {
    return <Icon className={className} />;
  }

  return (
    <div className="flex h-full flex-col justify-between bg-white overflow-y-auto relative">
      <div className="px-3 py-4">
        <div className="flex items-center justify-between px-4 pb-6 mb-6 border-b border-slate-100">
           <div className="flex items-center">
                <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-lg mr-3 shadow-lg shadow-slate-900/20">O</div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">OSPREY</h1>
           </div>
           {/* Close button for mobile */}
           <Button variant="ghost" size="sm" className="md:hidden" onClick={onLinkClick}>
                <X className="h-5 w-5 text-slate-500" />
           </Button>
        </div>

        <div className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Main Menu
        </div>

        <nav className="space-y-1">
          {filteredLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={onLinkClick}
              className={({ isActive }) =>
                cn(
                  'group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <LinkIcon
                    icon={link.icon}
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                    )}
                  />
                  {link.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
           <div className="rounded-lg bg-white p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase">System Status</p>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                 </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">All Systems Operational</p>
              <p className="text-[10px] text-slate-400 mt-1">v2.4.0 (Stable)</p>
           </div>
      </div>
    </div>
  );
};
