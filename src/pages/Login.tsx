import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, GraduationCap, Store, ShieldCheck } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';
import type { UserRole } from '../types';

const slides = [
  {
    id: 1,
    title: "Your Campus Super App",
    description: "Everything you need for university life in one place. Food, stationary, travel, and more.",
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80",
  },
  {
    id: 2,
    title: "Meet Ernest AI",
    description: "The smartest student on campus. Format docs, scan notes, and get assignment help instantly.",
    image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80",
  },
  {
    id: 3,
    title: "Student Marketplace",
    description: "Order late-night noodles, book bus tickets, or find a second-hand book. All student-friendly prices.",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&q=80",
  },
];

export const Login = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [role, setRole] = useState<UserRole>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState(''); // Only for admin backdoor really
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Pass password as second arg. If it's empty, AuthContext treats as standard login (if identifier present)
    // unless identifier is '123' then it needs password '123'
    const success = await login(identifier, password || 'simulated-otp', role);

    setIsLoading(false);
    if (success) {
      if (identifier === '123' && password === '123') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } else {
      alert('Login failed. Please enter a valid phone number.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl grid md:grid-cols-2 overflow-hidden shadow-2xl border-0 h-[600px]">
        {/* Slider Section */}
        <div className="relative hidden md:flex flex-col text-white bg-indigo-600">
          <AnimatePresence mode="wait">
             <motion.div
               key={currentSlide}
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.5 }}
               className="absolute inset-0"
             >
               <img
                 src={slides[currentSlide].image}
                 alt="Onboarding"
                 className="w-full h-full object-cover mix-blend-overlay opacity-50"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/90 to-indigo-600/30" />
             </motion.div>
          </AnimatePresence>

          <div className="relative z-10 flex-1 flex flex-col justify-end p-12">
             <motion.div
               key={currentSlide}
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.2 }}
             >
               <h2 className="text-3xl font-bold mb-4">{slides[currentSlide].title}</h2>
               <p className="text-indigo-100 text-lg mb-8">{slides[currentSlide].description}</p>
             </motion.div>

             <div className="flex space-x-2">
               {slides.map((_, idx) => (
                 <button
                   key={idx}
                   onClick={() => setCurrentSlide(idx)}
                   className={cn(
                     "w-2.5 h-2.5 rounded-full transition-all",
                     idx === currentSlide ? "bg-white w-8" : "bg-white/40"
                   )}
                 />
               ))}
             </div>
          </div>
        </div>

        {/* Login Form Section */}
        <div className="p-8 md:p-12 flex flex-col justify-center bg-white dark:bg-slate-800">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-tighter text-indigo-600 dark:text-indigo-400 mb-2">
              U<span className="text-2xl uppercase">ɴ</span>iMonday
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Welcome back! Please enter your details.</p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl mb-8">
            <button
              onClick={() => setRole('student')}
              className={cn(
                "flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-medium transition-all",
                role === 'student'
                  ? "bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow-sm"
                  : "text-slate-500 dark:text-slate-300 hover:text-slate-700"
              )}
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              Student
            </button>
            <button
              onClick={() => setRole('merchant')}
              className={cn(
                "flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-medium transition-all",
                role === 'merchant'
                  ? "bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow-sm"
                  : "text-slate-500 dark:text-slate-300 hover:text-slate-700"
              )}
            >
              <Store className="w-4 h-4 mr-2" />
              Merchant
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label={role === 'student' ? "Phone Number" : "Merchant ID"}
              placeholder={role === 'student' ? "+255 700 000 000" : "Merchant ID"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />

            <div className="relative">
               <Input
                 type="password"
                 label="Password / OTP"
                 placeholder="Enter OTP (Simulated)"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
               />
               <div className="absolute top-0 right-0">
                  <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1 rounded">Try: 123 / 123</span>
               </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base mt-2"
              isLoading={isLoading}
            >
              {isLoading ? "Verifying..." : "Continue"}
              {!isLoading && <ChevronRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Secure Encrypted Connection
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
