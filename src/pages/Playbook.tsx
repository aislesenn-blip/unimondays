import { useState } from 'react';
import { IngestionStep } from '../components/playbook/IngestionStep';
import { MetadataStep } from '../components/playbook/MetadataStep';
import { GenerationView } from '../components/playbook/GenerationView';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Playbook = () => {
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

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 pb-20">
            {/* Header (Minimal) */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-center z-10">
                <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span className="text-emerald-500">Playbook</span> Document Factory
                </h1>
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
