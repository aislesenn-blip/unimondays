import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, GraduationCap, Store, ShieldCheck, MapPin, Clock, Search, Briefcase } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';
import type { UserRole, Category } from '../types';

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
const categories: Category[] = ['Stationary', 'Food', 'Travel', 'Opportunities', 'Tech', 'Grooming', 'Other'];

export const Login = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [role, setRole] = useState<UserRole>('student');
  const [wizardStep, setWizardStep] = useState(1);

  // Form State
  const [university, setUniversity] = useState('');
  const [merchantCategory, setMerchantCategory] = useState<Category>('Stationary');
  const [openingHours, setOpeningHours] = useState('08:00');
  const [closingHours, setClosingHours] = useState('20:00');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const success = await login(
      identifier,
      password || 'simulated-otp',
      role,
      university || 'UDSM',
      role === 'merchant' ? merchantCategory : undefined
    );

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

  const nextStep = () => {
    if (wizardStep === 2 && role === 'student') {
      setWizardStep(4);
    } else {
      setWizardStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (wizardStep === 4 && role === 'student') {
      setWizardStep(2);
    } else {
      setWizardStep(prev => prev - 1);
    }
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
               <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Select Your Role</h2>
               <p className="text-slate-500 text-sm">Are you looking to buy or sell?</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => setRole('student')}
                className={cn(
                  "flex items-center p-4 rounded-xl border-2 transition-all",
                  role === 'student'
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                )}
              >
                <div className={cn("p-3 rounded-full mr-4", role === 'student' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500")}>
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <span className="block font-bold text-slate-900 dark:text-slate-100">Student</span>
                  <span className="text-xs text-slate-500">I want to discover services and deals.</span>
                </div>
              </button>

              <button
                onClick={() => setRole('merchant')}
                className={cn(
                  "flex items-center p-4 rounded-xl border-2 transition-all",
                  role === 'merchant'
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                )}
              >
                <div className={cn("p-3 rounded-full mr-4", role === 'merchant' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500")}>
                  <Store className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <span className="block font-bold text-slate-900 dark:text-slate-100">Merchant</span>
                  <span className="text-xs text-slate-500">I want to sell products or services.</span>
                </div>
              </button>
            </div>
            <Button onClick={nextStep} className="w-full h-12">Next Step <ChevronRight className="w-4 h-4 ml-2" /></Button>
          </motion.div>
        );

      case 2: // University Selection
        return (
          <motion.div
             initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
             className="space-y-6"
          >
             <div className="text-center mb-6">
               <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Select University</h2>
               <p className="text-slate-500 text-sm">Where are you located?</p>
            </div>

            <div className="space-y-4">
               <div className="relative">
                 <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                 <select
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
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
               <Button onClick={() => university ? nextStep() : alert("Please select a university")} className="flex-1">
                 Next <ChevronRight className="w-4 h-4 ml-2" />
               </Button>
            </div>
          </motion.div>
        );

      case 3: // Merchant Setup (Skipped for Students)
        return (
          <motion.div
             initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
             className="space-y-4"
          >
            <div className="text-center mb-4">
               <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Business Setup</h2>
               <p className="text-slate-500 text-sm">Tell us about your business.</p>
            </div>

            <div className="space-y-3">
               <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Category</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <select
                      value={merchantCategory}
                      onChange={(e) => setMerchantCategory(e.target.value as Category)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Opens At</label>
                    <div className="relative">
                       <Clock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                       <input
                         type="time"
                         value={openingHours}
                         onChange={(e) => setOpeningHours(e.target.value)}
                         className="w-full pl-10 pr-2 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                       />
                    </div>
                 </div>
                 <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Closes At</label>
                    <div className="relative">
                       <Clock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                       <input
                         type="time"
                         value={closingHours}
                         onChange={(e) => setClosingHours(e.target.value)}
                         className="w-full pl-10 pr-2 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                       />
                    </div>
                 </div>
               </div>

               <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">SEO Keywords (Comma separated)</label>
                  <Input
                    placeholder="e.g. cheap, printing, late night"
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                  />
               </div>
            </div>

            <div className="flex gap-3 mt-4">
               <Button variant="outline" onClick={prevStep} className="flex-1">Back</Button>
               <Button onClick={nextStep} className="flex-1">Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
            </div>
          </motion.div>
        );

      case 4: // Login Credentials
        return (
           <motion.div
             initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
             className="space-y-6"
          >
             <div className="text-center mb-6">
               <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Almost There</h2>
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
                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1 rounded">Try: 123 / 123</span>
                 </div>
              </div>

              <div className="flex gap-3 mt-6">
                 <Button type="button" variant="outline" onClick={prevStep} className="flex-1">Back</Button>
                 <Button
                   type="submit"
                   className="flex-1"
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
            <p className="text-slate-500 dark:text-slate-400 text-sm">Step {wizardStep} of 4</p>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-1 mt-2">
               <div className="bg-indigo-600 h-1 rounded-full transition-all duration-300" style={{ width: `${(wizardStep / 4) * 100}%` }}></div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          <div className="mt-auto text-center pt-6">
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
