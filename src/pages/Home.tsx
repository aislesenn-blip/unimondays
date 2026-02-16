import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Search, MapPin, Coffee, Printer, Zap } from 'lucide-react';
import { MarketplaceGrid } from '../components/marketplace/MarketplaceGrid';
import { mockBusinesses } from '../data/mockData';
import { Link } from 'react-router-dom';

export const Home = () => {
  const { user } = useAuth();

  // Filter by University, then take first 4 for Trending
  const filteredBusinesses = mockBusinesses.filter(b => b.university === (user?.university || 'UDSM'));
  const trendingBusinesses = filteredBusinesses.slice(0, 4);

  return (
    <div className="space-y-10 pb-24">
      {/* Hero Section - Clean Light Mode */}
      <section className="pt-4 pb-2 px-2">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            {/* Greeting */}
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
              Hello, <span className="text-indigo-600">{user?.name?.split(' ')[0] || 'Scholar'}</span>.
            </h1>

            <p className="text-slate-500 text-lg font-medium mt-2">
              It's UɴiMonday at <span className="font-semibold text-slate-700">{user?.university || 'Campus'}</span>.
            </p>

            {/* Floating Search Bar */}
            <div className="relative w-full max-w-2xl group mt-8">
               <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                 <Search className="h-6 w-6 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
               </div>
               <input
                 type="text"
                 placeholder="Search notes, food, or travel..."
                 className="w-full pl-14 pr-6 py-4 md:py-5 text-lg bg-white border border-slate-100 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200 transition-all shadow-xl hover:shadow-2xl"
               />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 px-4">
           <h2 className="text-xl font-bold text-slate-900 tracking-tight">Essentials</h2>
        </div>
        <div className="grid grid-cols-4 gap-4 px-2">
           {[
             { icon: Zap, label: "Ernest AI", color: "bg-indigo-50 text-indigo-600", path: "/ernest" },
             { icon: Coffee, label: "Dining", color: "bg-orange-50 text-orange-600", path: "/marketplace" },
             { icon: Printer, label: "Print", color: "bg-blue-50 text-blue-600", path: "/marketplace" },
             { icon: MapPin, label: "Travel", color: "bg-emerald-50 text-emerald-600", path: "/marketplace" },
           ].map((action, idx) => (
             <Link key={idx} to={action.path} className="flex flex-col items-center gap-3 group">
               <motion.div
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 ${action.color} transition-all`}
               >
                 <action.icon className="w-7 h-7 md:w-9 md:h-9" />
               </motion.div>
               <span className="text-xs md:text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                 {action.label}
               </span>
             </Link>
           ))}
        </div>
      </section>

      {/* Trending / Recommended */}
      <section className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 px-4">
           <h2 className="text-xl font-bold text-slate-900 tracking-tight">Trending</h2>
           <Link to="/marketplace" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
             View All
           </Link>
        </div>
        <div className="px-2">
           <MarketplaceGrid businesses={trendingBusinesses} />
        </div>
      </section>
    </div>
  );
};
