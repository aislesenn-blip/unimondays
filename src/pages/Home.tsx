import { useState, useEffect, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Search, MapPin, Coffee, Printer, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockBusinesses } from '../data/mockData';

// Lazy Load Trending Businesses
const BusinessCard = lazy(() => import('../components/marketplace/BusinessCard').then(module => ({ default: module.BusinessCard })));

export const Home = () => {
  const { user } = useAuth();
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholders = ["Search for Notes...", "Search for Print Services...", "Search for Food..."];

  // Typing animation for placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Filter trending businesses
  const trendingBusinesses = mockBusinesses.filter(b =>
    (b.university === (user?.university || 'UDSM')) &&
    (b.category === 'Food' || b.category === 'Stationary')
  ).slice(0, 4);

  return (
    <div className="space-y-12 pb-24">
      {/* Hero Section - Clean Light Mode with Floating Search */}
      <section className="bg-white rounded-b-[30px] pt-8 pb-8 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            {/* Branding - UniMonday Wordmark */}
            <h1 className="text-4xl md:text-6xl tracking-tight mb-2 font-sans">
              <span className="text-slate-900 font-extrabold">Uni</span>
              <span className="text-emerald-500 font-bold">Monday</span>
            </h1>

            <div className="flex items-center gap-3 text-lg md:text-xl font-medium text-slate-800">
              Your Campus Super App
              <span className="bg-emerald-50 text-emerald-700 text-xs px-3 py-1 rounded-full font-bold tracking-wide uppercase shadow-sm border border-emerald-100">
                {user?.university || 'Campus'}
              </span>
            </div>

            {/* Optimized Floating Search Bar */}
            <div className="w-full max-w-2xl mt-8 px-2">
              <div className="relative group shadow-md rounded-full bg-white transition-all hover:shadow-lg">
                 <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                   <Search className="h-6 w-6 text-emerald-500" />
                 </div>
                 <input
                   type="text"
                   placeholder={placeholders[placeholderIndex]}
                   className="w-full pl-16 pr-6 h-16 text-lg bg-transparent border-0 rounded-full text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                 />
              </div>
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
             { icon: Zap, label: "Playbook", path: "/playbook", bg: "bg-purple-100", color: "text-purple-600" },
             { icon: Coffee, label: "Dining", path: "/dining", bg: "bg-orange-100", color: "text-orange-600" },
             { icon: Printer, label: "Print", path: "/print", bg: "bg-blue-100", color: "text-blue-600" },
             { icon: MapPin, label: "Travel", path: "/travel", bg: "bg-emerald-100", color: "text-emerald-600" },
           ].map((action, idx) => (
             <Link key={idx} to={action.path} className="flex flex-col items-center gap-3 group">
               <motion.div
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 className={`w-16 h-16 md:w-20 md:h-20 rounded-3xl flex items-center justify-center shadow-sm border border-slate-100 ${action.bg} group-hover:shadow-md transition-all`}
               >
                 <action.icon className={`w-8 h-8 ${action.color}`} />
               </motion.div>
               <span className="text-sm md:text-base font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">
                 {action.label}
               </span>
             </Link>
           ))}
        </div>
      </section>

      {/* Trending Now (Lazy Loaded) */}
      <section className="max-w-5xl mx-auto px-4 pt-4">
        <div className="flex justify-between items-center mb-6 px-2">
           <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Trending Now</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
           <Suspense fallback={<div className="col-span-full text-center text-slate-400 py-12">Loading trends...</div>}>
             {trendingBusinesses.map((business, index) => (
               <motion.div
                 key={business.id}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: index * 0.1, duration: 0.5 }}
               >
                 <BusinessCard business={business} />
               </motion.div>
             ))}
           </Suspense>
        </div>
      </section>

    </div>
  );
};
