import { NavLink } from 'react-router-dom';
import { Home, Search, ShoppingBag, User, LayoutDashboard } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export const BottomNav = () => {
  const { user } = useAuth();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Ernest', path: '/ernest' },
    { icon: ShoppingBag, label: 'Market', path: '/marketplace' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  if (user?.role === 'admin') {
    navItems.splice(2, 0, { icon: LayoutDashboard, label: 'Admin', path: '/admin' });
    // Insert in middle or just append? Appending makes it 5 items.
    // Let's just append.
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-slate-200 pb-safe shadow-lg">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
              isActive
                ? "text-indigo-600"
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Icon className="w-6 h-6" />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
