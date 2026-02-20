import { useState } from 'react';
import { IngestionStep } from '../components/playbook/IngestionStep';
import { MetadataStep } from '../components/playbook/MetadataStep';
import { GenerationView } from '../components/playbook/GenerationView';
import { BrainInterface } from '../components/playbook/brain/BrainInterface';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Brain, FileText, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Playbook = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState<'factory' | 'brain' | null>(null);
    const [step, setStep] = useState<'ingest' | 'metadata' | 'generate'>('ingest');
    const [rawText, setRawText] = useState('');
    const [metadata, setMetadata] = useState<any>(null);

    const handleIngestion = (text: string) => {
        setRawText(text);
        setStep('metadata');
    };

    const handleMetadata = (meta: any) => {
        setMetadata(meta);
        setStep('generate');
    };

    // --- MODE SELECTION ---
    if (!mode) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in duration-500">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Playbook Ecosystem</h1>
                    <p className="text-slate-500">Choose your academic power tool.</p>
                </div>

                <div className="grid gap-4 w-full max-w-sm">
                    <button
                        onClick={() => setMode('brain')}
                        className="flex items-center gap-4 p-6 bg-slate-900 text-white rounded-3xl shadow-xl hover:scale-105 transition-transform text-left group"
                    >
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/50">
                            <Brain className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Offline Brain</h3>
                            <p className="text-xs text-slate-400 mt-1">AI Tutor. Explains in Swanglish. 300MB Download.</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setMode('factory')}
                        className="flex items-center gap-4 p-6 bg-white text-slate-900 border border-slate-200 rounded-3xl shadow-sm hover:border-emerald-500 hover:scale-105 transition-all text-left"
                    >
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <FileText className="w-6 h-6 text-slate-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Document Factory</h3>
                            <p className="text-xs text-slate-500 mt-1">Auto-format assignments & reports. PDF Generation.</p>
                        </div>
                    </button>
                </div>

                <Button variant="ghost" onClick={() => navigate('/home')} className="text-slate-400">Back to Home</Button>
            </div>
        );
    }

    if (mode === 'brain') {
        return (
            <div className="min-h-screen bg-slate-50 relative pb-20">
                 <div className="absolute top-4 left-4 z-20">
                    <Button variant="ghost" size="icon" onClick={() => setMode(null)} className="bg-white/80 backdrop-blur shadow-sm rounded-full">
                        <ChevronLeft className="w-5 h-5 text-slate-700" />
                    </Button>
                 </div>
                 <div className="max-w-2xl mx-auto pt-4 px-4 h-full">
                    <BrainInterface />
                 </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 pb-20">
            {/* Header (Minimal) */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 z-10">
                <Button variant="ghost" size="icon" onClick={() => setMode(null)}>
                    <ChevronLeft className="w-5 h-5 text-slate-700" />
                </Button>
                <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span className="text-emerald-500">Playbook</span> Factory
                </h1>
                <div className="w-10"></div>
            </div>

            {/* Wizard Container */}
            <div className="w-full max-w-2xl mt-20 relative z-0">
                {/* Progress Indicators */}
                <div className="flex justify-between mb-8 px-4 relative">
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -z-10 transform -translate-y-1/2"></div>

                    {[
                        { id: 'ingest', label: 'Ingest' },
                        { id: 'metadata', label: 'Configure' },
                        { id: 'generate', label: 'Build' }
                    ].map((s, idx) => (
                        <div key={s.id} className="flex flex-col items-center gap-2 bg-slate-50 px-2 z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step === s.id ? 'bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-200' : 'bg-white border-2 border-slate-200 text-slate-400'}`}>
                                {idx + 1}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${step === s.id ? 'text-emerald-600' : 'text-slate-400'}`}>{s.label}</span>
                        </div>
                    ))}
                </div>

                <AnimatePresence mode='wait'>
                    {step === 'ingest' && (
                        <motion.div key="ingest" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <IngestionStep onData={handleIngestion} onNext={() => setStep('metadata')} />
                        </motion.div>
                    )}

                    {step === 'metadata' && (
                        <motion.div key="metadata" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <MetadataStep onData={handleMetadata} onNext={() => setStep('generate')} onBack={() => setStep('ingest')} />
                        </motion.div>
                    )}

                    {step === 'generate' && (
                        <motion.div key="generate" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                            <GenerationView text={rawText} metadata={metadata} onBack={() => setStep('ingest')} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

        </div>
    );
};
