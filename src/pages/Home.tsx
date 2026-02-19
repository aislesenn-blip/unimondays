import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Search, MapPin, Coffee, Printer, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockBusinesses } from '../data/mockData';
import { BusinessCard } from '../components/marketplace/BusinessCard';

export const Home = () => {
  const { user } = useAuth();

  // Filter trending businesses: Show a mix of Food and Stationary
  const trendingBusinesses = mockBusinesses.filter(b =>
    (b.university === (user?.university || 'UDSM')) &&
    (b.category === 'Food' || b.category === 'Stationary')
  ).slice(0, 4); // Show top 4

  return (
    <div className="space-y-12 pb-24">
      {/* Hero Section - Clean Light Mode with Massive Search */}
      {/* Container Card for Header */}
      <section className="bg-white shadow-md rounded-b-[30px] pt-8 pb-8 px-4 border-b border-slate-100">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            {/* Greeting */}
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-2">
              Hello, <span className="text-emerald-500">{user?.name?.split(' ')[0] || 'Scholar'}</span>.
            </h1>

            <div className="flex items-center gap-3 text-lg md:text-xl font-medium text-slate-800">
              It's UɴiMonday
              <span className="bg-emerald-50 text-emerald-700 text-xs px-3 py-1 rounded-full font-bold tracking-wide uppercase shadow-sm border border-emerald-100">
                {user?.university || 'Campus'}
              </span>
            </div>

            {/* Huge Floating Search Bar Card */}
            <div className="w-full max-w-2xl mt-8">
              <div className="relative group bg-white rounded-2xl shadow-xl border border-slate-100 transition-all hover:shadow-2xl">
                 <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                   <Search className="h-6 w-6 text-emerald-500" />
                 </div>
                 <input
                   type="text"
                   placeholder="Search notes, food, or travel..."
                   className="w-full pl-16 pr-6 h-16 text-xl bg-transparent border-0 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-semibold"
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

      {/* Trending Now */}
      <section className="max-w-5xl mx-auto px-4 pt-4">
        <div className="flex justify-between items-center mb-6 px-2">
           <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Trending Now</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
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
        </div>
      </section>

    </div>
  );
};
