import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, GraduationCap, Store, ShieldCheck, Search } from 'lucide-react';
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

const universities = ["UDSM", "IFM", "CBE", "DIT", "UDOM", "ARU", "MUHAS", "SUA"];

export const Login = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [role, setRole] = useState<UserRole>('student');
  const [wizardStep, setWizardStep] = useState(1);

  // Form State
  const [university, setUniversity] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in (or just logged in)
  useEffect(() => {
    console.log("Login: useEffect triggered. User:", user);
    if (user) {
      console.log("Login: Navigating based on role:", user.role);
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'merchant') {
        navigate('/merchant-dashboard');
      } else {
        console.log("Login: Navigating to /home (Home)");
        navigate('/home');
      }
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login: handleLogin triggered with role:", role);
    setIsLoading(true);

    // Mock Login - always true for verification if inputs filled
    const success = await login(
      identifier,
      password || 'simulated-otp',
      role,
      university || 'UDSM'
    );

    console.log("Login: result success:", success);
    setIsLoading(false);

    // Explicit navigation if successful, just in case useEffect misses or has race condition
    if (success) {
      if (role === 'student') {
        console.log("Login: Manual nav to /home");
        navigate('/home');
      } else if (role === 'merchant') {
        console.log("Login: Manual nav to /merchant-dashboard");
        navigate('/merchant-dashboard');
      } else if (role === 'admin') {
         navigate('/admin');
      }
    }

    if (!success) {
      alert('Login failed. Please enter a valid phone number.');
    }
  };

  const nextStep = () => {
    setWizardStep(prev => prev + 1);
  };

  const prevStep = () => {
    setWizardStep(prev => prev - 1);
  };

  const renderStep = () => {
    switch (wizardStep) {
      case 1: // Role Selection
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
               <h2 className="text-xl font-bold text-slate-900">Select Your Role</h2>
               <p className="text-slate-500 text-sm">Are you looking to buy or sell?</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => setRole('student')}
                className={cn(
                  "flex items-center p-4 rounded-xl border-2 transition-all",
                  role === 'student'
                    ? "border-emerald-500 bg-emerald-50 shadow-sm"
                    : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
                )}
              >
                <div className={cn("p-3 rounded-full mr-4 transition-colors", role === 'student' ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500")}>
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <span className="block font-bold text-slate-900">Student</span>
                  <span className="text-xs text-slate-500">I want to discover services and deals.</span>
                </div>
              </button>

              <button
                onClick={() => setRole('merchant')}
                className={cn(
                  "flex items-center p-4 rounded-xl border-2 transition-all",
                  role === 'merchant'
                    ? "border-emerald-500 bg-emerald-50 shadow-sm"
                    : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
                )}
              >
                <div className={cn("p-3 rounded-full mr-4 transition-colors", role === 'merchant' ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500")}>
                  <Store className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <span className="block font-bold text-slate-900">Partner with Us</span>
                  <span className="text-xs text-slate-500">I want to sell products or services.</span>
                </div>
              </button>
            </div>
            <Button onClick={nextStep} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700">Next Step <ChevronRight className="w-4 h-4 ml-2" /></Button>
          </motion.div>
        );

      case 2: // University Selection
        return (
          <motion.div
             initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
             className="space-y-6"
          >
             <div className="text-center mb-6">
               <h2 className="text-xl font-bold text-slate-900">Select University</h2>
               <p className="text-slate-500 text-sm">Where are you located?</p>
            </div>

            <div className="space-y-4">
               <div className="relative">
                 <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                 <select
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none text-slate-900"
                 >
                   <option value="" disabled>Select your campus...</option>
                   {universities.map(u => (
                     <option key={u} value={u}>{u}</option>
                   ))}
                 </select>
               </div>

               <p className="text-xs text-slate-400 text-center">
                 Your feed will be customized based on your selection.
               </p>
            </div>

            <div className="flex gap-3">
               <Button variant="outline" onClick={prevStep} className="flex-1">Back</Button>
               <Button onClick={() => university ? nextStep() : alert("Please select a university")} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                 Next <ChevronRight className="w-4 h-4 ml-2" />
               </Button>
            </div>
          </motion.div>
        );

      case 3: // Login Credentials (was 4)
        return (
           <motion.div
             initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
             className="space-y-6"
          >
             <div className="text-center mb-6">
               <h2 className="text-xl font-bold text-slate-900">Almost There</h2>
               <p className="text-slate-500 text-sm">Enter your phone number to continue.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label={role === 'student' ? "Phone Number" : "Merchant ID / Phone"}
                placeholder="+255 700 000 000"
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
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded">Try: 123 / 123</span>
                 </div>
              </div>

              <div className="flex gap-3 mt-6">
                 <Button type="button" variant="outline" onClick={prevStep} className="flex-1">Back</Button>
                 <Button
                   type="submit"
                   className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                   isLoading={isLoading}
                 >
                   {isLoading ? "Verifying..." : "Login"}
                 </Button>
              </div>
            </form>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl grid md:grid-cols-2 overflow-hidden shadow-2xl border-0 h-[600px]">
        {/* Slider Section */}
        <div className="relative hidden md:flex flex-col text-white bg-emerald-600">
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
               <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/90 to-emerald-600/30" />
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
               <p className="text-emerald-100 text-lg mb-8">{slides[currentSlide].description}</p>
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
        <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
          <div className="mb-8 text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
               <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-emerald-500/20">
                U
               </div>
               <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                UɴiMonday
               </h1>
            </div>

            <p className="text-slate-500 text-sm mt-2">Step {wizardStep} of 3</p>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-1 mt-4">
               <div className="bg-emerald-500 h-1 rounded-full transition-all duration-300" style={{ width: `${(wizardStep / 3) * 100}%` }}></div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          <div className="mt-auto text-center pt-6">
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Secure Encrypted Connection
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
