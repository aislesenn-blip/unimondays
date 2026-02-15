import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Settings, CreditCard, Bell, LogOut } from 'lucide-react';

export const Profile = () => {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-2xl font-bold px-2 text-slate-900 dark:text-slate-100">Profile</h1>

      <Card>
        <CardContent className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-2xl">
            {user?.name?.[0] || 'U'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{user?.name}</h2>
            <p className="text-slate-500 dark:text-slate-400 capitalize">{user?.role}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1">{user?.id}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Button variant="ghost" className="w-full justify-start text-base h-12 px-4">
           <Settings className="mr-4 w-5 h-5 text-slate-500" />
           Settings
        </Button>
        <Button variant="ghost" className="w-full justify-start text-base h-12 px-4">
           <CreditCard className="mr-4 w-5 h-5 text-slate-500" />
           Payment Methods
        </Button>
        <Button variant="ghost" className="w-full justify-start text-base h-12 px-4">
           <Bell className="mr-4 w-5 h-5 text-slate-500" />
           Notifications
        </Button>

        <div className="pt-4">
           <Button variant="destructive" className="w-full justify-start text-base h-12 px-4 bg-red-50 text-red-600 hover:bg-red-100 shadow-none dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40" onClick={logout}>
             <LogOut className="mr-4 w-5 h-5" />
             Log Out
           </Button>
        </div>
      </div>
    </div>
  );
};
