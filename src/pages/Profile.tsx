import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Settings, CreditCard, Bell, LogOut, MapPin, ChevronRight } from 'lucide-react';

const universities = ["UDSM", "IFM", "CBE", "DIT", "UDOM", "ARU", "MUHAS", "SUA"];

export const Profile = () => {
  const { user, logout, updateUserUniversity } = useAuth();

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-2xl font-bold px-2 text-slate-900 dark:text-slate-100">Profile</h1>

      <Card>
        <CardContent className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-2xl">
            {user?.name?.[0] || 'U'}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{user?.name}</h2>
            <p className="text-slate-500 dark:text-slate-400 capitalize">{user?.role}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1">{user?.id}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {/* University Switcher Section */}
        <div className="px-2">
           <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">My Campus</label>
           <div className="relative">
              <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-indigo-500" />
              <select
                data-testid="uni-selector"
                value={user?.university || ''}
                onChange={(e) => updateUserUniversity(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none text-slate-900 dark:text-slate-100 font-medium shadow-sm transition-shadow"
              >
                 {universities.map(u => (
                   <option key={u} value={u}>{u}</option>
                 ))}
              </select>
              <div className="absolute right-3 top-3.5 pointer-events-none">
                 <ChevronRight className="h-5 w-5 text-slate-400 rotate-90" />
              </div>
           </div>
           <p className="text-xs text-slate-400 mt-2 ml-1">
             Switching campus will update your feed instantly.
           </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-3 px-2">Account Settings</label>
          <Button variant="ghost" className="w-full justify-start text-base h-12 px-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-none first:rounded-t-xl last:rounded-b-xl border-b border-slate-100 dark:border-slate-800 last:border-0">
             <Settings className="mr-4 w-5 h-5 text-slate-500" />
             General Settings
          </Button>
          <Button variant="ghost" className="w-full justify-start text-base h-12 px-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-none border-b border-slate-100 dark:border-slate-800">
             <CreditCard className="mr-4 w-5 h-5 text-slate-500" />
             Payment Methods
          </Button>
          <Button variant="ghost" className="w-full justify-start text-base h-12 px-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-none last:rounded-b-xl">
             <Bell className="mr-4 w-5 h-5 text-slate-500" />
             Notifications
          </Button>
        </div>

        <div className="pt-4 px-2">
           <Button variant="destructive" className="w-full justify-start text-base h-12 px-4 bg-red-50 text-red-600 hover:bg-red-100 shadow-none dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40 border border-red-100 dark:border-red-900/30" onClick={logout}>
             <LogOut className="mr-4 w-5 h-5" />
             Log Out
           </Button>
        </div>
      </div>
    </div>
  );
};
