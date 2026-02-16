import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';
import { Store, Zap, Users } from 'lucide-react';
import { Card } from '../components/ui/Card';

export const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Hero Section */}
      <section className="relative h-[80vh] md:h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80"
            alt="University Campus Life"
            className="w-full h-full object-cover brightness-[0.4]"
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-4">
              UniMonday
            </h1>
            <p className="text-xl md:text-2xl text-slate-200 font-medium tracking-wide">
              Move Different.
            </p>
          </motion.div>

          <motion.div
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: 0.5, duration: 0.5 }}
          >
             <Button
               onClick={() => navigate('/login')}
               className="h-14 px-8 text-lg bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-xl shadow-emerald-500/30 transform transition-all hover:-translate-y-1"
             >
               Have your UniMonday account
             </Button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 max-w-6xl mx-auto -mt-24 relative z-20">
        <div className="grid md:grid-cols-3 gap-6">
           {/* Card 1: Marketplace */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: 0.1 }}
           >
             <Card className="h-full bg-white shadow-xl border-0 p-6 flex flex-col items-center text-center space-y-4 hover:shadow-2xl transition-shadow">
                <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-2">
                   <Store className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Campus Marketplace</h3>
                <p className="text-slate-600">
                  Buy, sell, and discover student deals. From textbooks to late-night snacks, find everything within your campus.
                </p>
                <img
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&q=80"
                  alt="Marketplace"
                  className="w-full h-32 object-cover rounded-lg mt-auto"
                />
             </Card>
           </motion.div>

           {/* Card 2: Ernest AI */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: 0.2 }}
           >
             <Card className="h-full bg-white shadow-xl border-0 p-6 flex flex-col items-center text-center space-y-4 hover:shadow-2xl transition-shadow ring-2 ring-emerald-500 ring-offset-2">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-2">
                   <Zap className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Ernest AI</h3>
                <p className="text-slate-600">
                  Your offline-first digital study partner. Summarize notes, fix citations, and format documents instantly.
                </p>
                <img
                  src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80"
                  alt="AI Partner"
                  className="w-full h-32 object-cover rounded-lg mt-auto"
                />
             </Card>
           </motion.div>

           {/* Card 3: Community */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: 0.3 }}
           >
             <Card className="h-full bg-white shadow-xl border-0 p-6 flex flex-col items-center text-center space-y-4 hover:shadow-2xl transition-shadow">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-2">
                   <Users className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Student Community</h3>
                <p className="text-slate-600">
                  Connect with peers, find events, and stay updated with what's happening at your specific university.
                </p>
                <img
                  src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80"
                  alt="Community"
                  className="w-full h-32 object-cover rounded-lg mt-auto"
                />
             </Card>
           </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} UniMonday. Built for Students.</p>
      </footer>
    </div>
  );
};
