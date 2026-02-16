import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { User, School, LogOut } from 'lucide-react';
import { useState } from 'react';

const universities = ["UDSM", "IFM", "CBE", "DIT", "UDOM", "ARU", "MUHAS", "SUA"];

export const Profile = () => {
  const { user, logout, updateUserUniversity } = useAuth();
  const [isEditingUni, setIsEditingUni] = useState(false);
  const [selectedUni, setSelectedUni] = useState(user?.university || 'UDSM');

  const handleUniChange = () => {
    updateUserUniversity(selectedUni);
    setIsEditingUni(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-2xl">
          {user?.name?.charAt(0) || 'U'}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{user?.name}</h1>
          <p className="text-slate-500 capitalize">{user?.role} Account</p>
        </div>
      </div>

      <div className="grid gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-0 divide-y divide-slate-100">

            {/* Phone */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
                   <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Phone Number</p>
                  <p className="text-xs text-slate-500">{user?.phone || 'Not set'}</p>
                </div>
              </div>
            </div>

            {/* University Switcher */}
            <div className="p-4">
               <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
                       <School className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">University</p>
                      {!isEditingUni && <p className="text-xs text-slate-500">{user?.university}</p>}
                    </div>
                  </div>

                  {!isEditingUni ? (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingUni(true)} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                      Change
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                       <Button size="sm" variant="ghost" onClick={() => setIsEditingUni(false)}>Cancel</Button>
                       <Button size="sm" onClick={handleUniChange} className="bg-emerald-600 hover:bg-emerald-700 text-white">Save</Button>
                    </div>
                  )}
               </div>

               {isEditingUni && (
                 <div className="mt-3 pl-12">
                    <select
                      value={selectedUni}
                      onChange={(e) => setSelectedUni(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {universities.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                 </div>
               )}
            </div>

          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 mt-4">
           <CardContent className="p-0">
             <button onClick={logout} className="w-full flex items-center gap-3 p-4 text-red-600 hover:bg-red-50 transition-colors text-left">
               <div className="p-2 bg-red-50 rounded-lg">
                  <LogOut className="w-5 h-5" />
               </div>
               <span className="font-medium">Sign Out</span>
             </button>
           </CardContent>
        </Card>
      </div>
    </div>
  );
};
