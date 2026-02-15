import { NavLink } from 'react-router-dom';
import { Home, Search, ShoppingBag, User, LogOut, LayoutDashboard } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = () => {
  const { user, logout } = useAuth();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Ernest', path: '/ernest' },
    { icon: ShoppingBag, label: 'Market', path: '/marketplace' },
    { icon: User, label: 'Account', path: '/profile' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ icon: LayoutDashboard, label: 'Dashboard', path: '/admin' });
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 p-6 z-40 flex flex-col justify-between hidden md:flex">
      <div>
        <div className="mb-8 pl-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-indigo-600 font-sans">
            UɴiMonday
          </h1>
        </div>

        <nav className="space-y-2">
          {navItems.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => cn(
                "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-indigo-50 text-indigo-600 font-semibold shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <button
        onClick={logout}
        className="flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full text-left group"
      >
        <LogOut className="w-5 h-5 group-hover:text-red-600" />
        <span>Sign Out</span>
      </button>
    </aside>
  );
};
