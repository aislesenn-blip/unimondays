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
    <div className="space-y-12 pb-24">
      {/* Hero Section - Clean Light Mode with Massive Search */}
      <section className="pt-8 pb-4 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            {/* Greeting */}
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-3">
              Hello, <span className="text-emerald-500">{user?.name?.split(' ')[0] || 'Scholar'}</span>.
            </h1>

            <p className="text-slate-500 text-lg md:text-xl font-medium">
              It's UɴiMonday at <span className="font-semibold text-slate-700">{user?.university || 'Campus'}</span>.
            </p>

            {/* Huge Floating Search Bar */}
            <div className="relative w-full max-w-2xl group mt-10">
               <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                 <Search className="h-7 w-7 text-emerald-500 group-focus-within:text-emerald-600 transition-colors" />
               </div>
               <input
                 type="text"
                 placeholder="Search notes, food, or travel..."
                 className="w-full pl-16 pr-8 h-16 text-xl bg-white border border-slate-100 rounded-full text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-200 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
               />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8 px-2">
           <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Essentials</h2>
        </div>
        <div className="grid grid-cols-4 gap-4 md:gap-8 px-2">
           {[
             { icon: Zap, label: "Ernest AI", color: "bg-emerald-50 text-emerald-600 border-emerald-100", path: "/ernest" },
             { icon: Coffee, label: "Dining", color: "bg-orange-50 text-orange-600 border-orange-100", path: "/marketplace" },
             { icon: Printer, label: "Print", color: "bg-blue-50 text-blue-600 border-blue-100", path: "/marketplace" },
             { icon: MapPin, label: "Travel", color: "bg-violet-50 text-violet-600 border-violet-100", path: "/marketplace" },
           ].map((action, idx) => (
             <Link key={idx} to={action.path} className="flex flex-col items-center gap-4 group">
               <motion.div
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 className={`w-20 h-20 md:w-24 md:h-24 rounded-3xl flex items-center justify-center shadow-sm border ${action.color} transition-all`}
               >
                 <action.icon className="w-8 h-8 md:w-10 md:h-10" />
               </motion.div>
               <span className="text-sm md:text-base font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                 {action.label}
               </span>
             </Link>
           ))}
        </div>
      </section>

      {/* Trending / Recommended */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8 px-2">
           <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Trending</h2>
           <Link to="/marketplace" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors bg-emerald-50 px-3 py-1 rounded-full">
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
