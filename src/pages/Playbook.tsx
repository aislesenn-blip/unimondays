import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlaybookPro } from '../components/playbook/PlaybookPro';
import { PlaybookX } from '../components/playbook/PlaybookX';
import { FileText, MonitorPlay, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export const Playbook = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState<'pro' | 'x'>('pro');

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">

            {/* Navigation Bar */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/home')} className="-ml-2 hover:bg-slate-100 rounded-full w-10 h-10 p-0 flex items-center justify-center">
                        <ChevronLeft className="w-5 h-5 text-slate-500" />
                    </Button>
                    <div>
                        <h1 className="font-black text-slate-900 text-lg tracking-tight flex items-center gap-2">
                            Playbook <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[10px] rounded font-bold uppercase tracking-widest">Studio</span>
                        </h1>
                    </div>
                </div>

                {/* Mode Switcher (Apple Segmented Control Style) */}
                <div className="bg-slate-100 p-1 rounded-lg flex items-center relative">
                    <motion.div
                        layoutId="active-pill"
                        className={`absolute inset-1 w-1/2 bg-white rounded-md shadow-sm pointer-events-none ${mode === 'x' ? 'translate-x-full' : ''}`}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />

                    <button
                        onClick={() => setMode('pro')}
                        className={`relative z-10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${mode === 'pro' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <FileText className="w-3 h-3" /> Formatter
                    </button>
                    <button
                        onClick={() => setMode('x')}
                        className={`relative z-10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${mode === 'x' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <MonitorPlay className="w-3 h-3" /> Slides X
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 py-12 lg:px-8 flex flex-col items-center">

                {/* Hero Text */}
                <div className="text-center mb-12 max-w-lg mx-auto space-y-2">
                    <AnimatePresence mode="wait">
                        {mode === 'pro' ? (
                            <motion.div
                                key="pro-text"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Perfect Documents. <span className="text-emerald-500">Instantly.</span></h2>
                                <p className="text-slate-500 font-medium">The Zero-Lag formatter for academic & professional papers.</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="x-text"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Presentations. <span className="text-indigo-600">Solved.</span></h2>
                                <p className="text-slate-500 font-medium">Turn raw text into professional slides in 2 seconds.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Applications */}
                <div className="w-full relative min-h-[600px]">
                    {/* Position absolute to allow cross-fading in place if needed, but simple conditional render is safer for height */}
                    <AnimatePresence mode="wait">
                        {mode === 'pro' ? (
                            <motion.div
                                key="pro-app"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                className="w-full"
                            >
                                <PlaybookPro isActive={true} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="x-app"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="w-full"
                            >
                                <PlaybookX isActive={true} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </main>

        </div>
    );
};
