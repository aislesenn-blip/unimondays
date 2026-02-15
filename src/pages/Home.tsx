import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Search, MapPin, Coffee, Printer, Zap } from 'lucide-react';
import { MarketplaceGrid } from '../components/marketplace/MarketplaceGrid';
import { mockBusinesses } from '../data/mockData';
import { Link } from 'react-router-dom';

export const Home = () => {
  const { user } = useAuth();

  // Filter for "Trending" or just first 4
  const trendingBusinesses = mockBusinesses.slice(0, 4);

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-indigo-600 text-white p-8 md:p-12 shadow-xl shadow-indigo-600/20">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-lime-400/20 blur-3xl"></div>

        <div className="relative z-10 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              Hello, <span className="text-lime-400">{user?.name?.split(' ')[0] || 'Scholar'}</span>.
            </h1>
            <p className="text-indigo-100 text-lg mb-8 max-w-md font-medium">
              Your campus. Connected.
            </p>

            <div className="relative max-w-md group">
               <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                 <Search className="h-5 w-5 text-indigo-300 group-focus-within:text-lime-400 transition-colors" />
               </div>
               <input
                 type="text"
                 placeholder="Search notes, food, or travel..."
                 className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-lime-400/50 transition-all"
               />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <div className="flex justify-between items-center mb-4 px-2">
           <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Essentials</h2>
        </div>
        <div className="grid grid-cols-4 gap-4 md:gap-6">
           {[
             { icon: Zap, label: "Ernest AI", color: "bg-violet-100 text-violet-600", path: "/ernest" },
             { icon: Coffee, label: "Dining", color: "bg-orange-100 text-orange-600", path: "/marketplace" },
             { icon: Printer, label: "Print", color: "bg-blue-100 text-blue-600", path: "/marketplace" },
             { icon: MapPin, label: "Travel", color: "bg-emerald-100 text-emerald-600", path: "/marketplace" },
           ].map((action, idx) => (
             <Link key={idx} to={action.path} className="flex flex-col items-center gap-2 group">
               <motion.div
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shadow-sm ${action.color} dark:bg-opacity-20 transition-all`}
               >
                 <action.icon className="w-6 h-6 md:w-8 md:h-8" />
               </motion.div>
               <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                 {action.label}
               </span>
             </Link>
           ))}
        </div>
      </section>

      {/* Trending / Recommended */}
      <section>
        <div className="flex justify-between items-center mb-4 px-2">
           <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Trending</h2>
           <Link to="/marketplace" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors">
             View All
           </Link>
        </div>
        <MarketplaceGrid businesses={trendingBusinesses} />
      </section>
    </div>
  );
};
