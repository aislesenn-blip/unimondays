import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlaybookPro } from '../components/playbook/PlaybookPro';
import { PlaybookX } from '../components/playbook/PlaybookX';
import { FileText, MonitorPlay, ChevronLeft, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export const Playbook = () => {
    const navigate = useNavigate();
    const [view, setView] = useState<'hub' | 'pro' | 'x'>('hub');

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">

            {/* Navigation Bar */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8 shadow-sm">
                <div className="flex items-center gap-4">
                    {view === 'hub' ? (
                        <Button variant="ghost" size="sm" onClick={() => navigate('/home')} className="-ml-2 hover:bg-slate-100 rounded-full w-10 h-10 p-0 flex items-center justify-center">
                            <ChevronLeft className="w-5 h-5 text-slate-500" />
                        </Button>
                    ) : (
                         <Button variant="ghost" size="sm" onClick={() => setView('hub')} className="-ml-2 hover:bg-slate-100 rounded-full w-10 h-10 p-0 flex items-center justify-center">
                            <ChevronLeft className="w-5 h-5 text-slate-500" />
                        </Button>
                    )}

                    <div>
                        <h1 className="font-black text-slate-900 text-lg tracking-tight flex items-center gap-2">
                            Playbook <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[10px] rounded font-bold uppercase tracking-widest">Studio</span>
                        </h1>
                    </div>
                </div>

                {/* Back to Studio Label (Only when inside a tool) */}
                {view !== 'hub' && (
                    <div className="hidden md:block text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {view === 'pro' ? 'Document Formatter' : 'Presentation Engine'}
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 py-12 lg:px-8 flex flex-col items-center justify-center min-h-[80vh]">

                <AnimatePresence mode="wait">

                    {/* HUB VIEW */}
                    {view === 'hub' && (
                        <motion.div
                            key="hub"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ duration: 0.3 }}
                            className="w-full flex flex-col items-center"
                        >
                            <div className="text-center mb-16 space-y-4">
                                <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                                    Create. <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-indigo-600">Automate.</span> Done.
                                </h2>
                                <p className="text-slate-500 text-lg font-medium max-w-xl mx-auto">
                                    Select a tool to begin. Zero design skills required.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">

                                {/* Card 1: Playbook PRO */}
                                <div
                                    onClick={() => setView('pro')}
                                    className="group relative bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-100/50 transition-all cursor-pointer overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110" />

                                    <div className="relative z-10 flex flex-col h-full justify-between space-y-8">
                                        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                            <FileText className="w-8 h-8" />
                                        </div>

                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">Playbook Pro</h3>
                                            <p className="text-slate-500 font-medium leading-relaxed">
                                                Automated Document Formatter. Turn messy drafts into perfect academic papers instantly.
                                            </p>
                                        </div>

                                        <div className="flex items-center text-emerald-600 font-bold uppercase text-xs tracking-wider group-hover:gap-2 transition-all">
                                            Open Formatter <ArrowRight className="w-4 h-4 ml-1" />
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: Playbook X */}
                                <div
                                    onClick={() => setView('x')}
                                    className="group relative bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all cursor-pointer overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110" />

                                    <div className="relative z-10 flex flex-col h-full justify-between space-y-8">
                                        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            <MonitorPlay className="w-8 h-8" />
                                        </div>

                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-indigo-700 transition-colors">Playbook X</h3>
                                            <p className="text-slate-500 font-medium leading-relaxed">
                                                Text-to-Presentation Engine. Write content, get slides. No design work needed.
                                            </p>
                                        </div>

                                        <div className="flex items-center text-indigo-600 font-bold uppercase text-xs tracking-wider group-hover:gap-2 transition-all">
                                            Open Studio <ArrowRight className="w-4 h-4 ml-1" />
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </motion.div>
                    )}

                    {/* PRO VIEW */}
                    {view === 'pro' && (
                        <motion.div
                            key="pro"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="w-full"
                        >
                            <PlaybookPro isActive={true} />
                        </motion.div>
                    )}

                    {/* X VIEW */}
                    {view === 'x' && (
                        <motion.div
                            key="x"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="w-full"
                        >
                            <PlaybookX isActive={true} />
                        </motion.div>
                    )}

                </AnimatePresence>

            </main>

        </div>
    );
};
