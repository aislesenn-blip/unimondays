import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Download, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';

// Worker Import
import XWorker from '../../workers/playbook-x.worker?worker';

interface PlaybookXProps {
    isActive: boolean;
}

export const PlaybookX = ({ isActive }: PlaybookXProps) => {
    const [text, setText] = useState(`# Introduction\nWelcome to Playbook X.\nThis tool generates slides instantly.\n\n# The Rules\nHeading 1 creates a new slide.\nParagraphs become bullet points.\nLong paragraphs are auto-split.\n\n# Features\nZero lag.\n100% Client-Side.\nDeterministic Formatting.`);
    const [theme, setTheme] = useState<'academic' | 'corporate' | 'dark'>('corporate');
    const [status, setStatus] = useState<'idle' | 'generating' | 'success'>('idle');
    const [pptBlob, setPptBlob] = useState<Blob | null>(null);

    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        workerRef.current = new XWorker();
        workerRef.current.onmessage = (e) => {
            const { status, blob, message } = e.data;
            if (status === 'success') {
                setPptBlob(blob);
                setStatus('success');
            } else if (status === 'error') {
                setStatus('idle');
                alert("Generation Failed: " + message);
            }
        };
        return () => workerRef.current?.terminate();
    }, []);

    const handleGenerate = () => {
        if (!workerRef.current) return;
        setStatus('generating');

        // Instant feel
        setTimeout(() => {
            workerRef.current?.postMessage({
                text,
                theme
            });
        }, 500); // 500ms for "Thinking" animation
    };

    const handleDownload = () => {
        if (!pptBlob) return;
        const url = URL.createObjectURL(pptBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Playbook_Presentation.pptx`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!isActive) return null;

    return (
        <div className="w-full max-w-5xl mx-auto h-[600px] bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 flex flex-col md:flex-row relative">

            {/* LEFT: Editor Area */}
            <div className="flex-1 flex flex-col border-r border-slate-100 bg-slate-50/50">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-200">
                            <Wand2 className="w-4 h-4" />
                        </div>
                        <span className="font-black text-slate-900 tracking-tight">Playbook <span className="text-indigo-600">X</span></span>
                    </div>
                    <div className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase rounded-full tracking-wider">
                        Text-to-PPTX
                    </div>
                </div>

                <textarea
                    className="flex-1 w-full p-6 bg-transparent resize-none outline-none font-mono text-sm text-slate-700 leading-relaxed placeholder-slate-400"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`# Slide Title\nBullet point 1\nBullet point 2\n\n# Next Slide\nMore content...`}
                    spellCheck={false}
                />

                <div className="p-2 bg-white border-t border-slate-100 text-[10px] text-slate-400 font-bold text-center uppercase tracking-widest flex justify-between px-4">
                    <span>Heading 1 = New Slide</span>
                    <span>Paragraphs = Bullets</span>
                    <span>{'>'} 3 Lines = Auto-Split</span>
                </div>
            </div>

            {/* RIGHT: Controls & Preview */}
            <div className="w-full md:w-80 bg-white flex flex-col z-10 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)]">

                {/* Theme Selector */}
                <div className="p-6 flex-1 space-y-6 overflow-y-auto">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Select Theme</label>
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { id: 'academic', name: 'Academic White', color: 'bg-slate-50 border-slate-200' },
                                { id: 'corporate', name: 'Corporate Blue', color: 'bg-blue-50 border-blue-200' },
                                { id: 'dark', name: 'Minimalist Dark', color: 'bg-slate-900 text-white border-slate-800' }
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id as any)}
                                    className={`relative p-4 rounded-xl border-2 text-left transition-all ${theme === t.id ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-100 hover:border-slate-300'} ${t.color}`}
                                >
                                    <span className={`font-bold text-sm ${t.id === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.name}</span>
                                    {theme === t.id && (
                                        <div className="absolute top-2 right-2 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                                            <Sparkles className="w-2 h-2" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Action Area */}
                <div className="p-6 bg-slate-50 border-t border-slate-100">
                    <AnimatePresence mode="wait">
                        {status === 'idle' ? (
                            <motion.div
                                key="generate"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <Button
                                    onClick={handleGenerate}
                                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xl shadow-indigo-200 text-lg"
                                >
                                    GENERATE SLIDES <Play className="w-4 h-4 ml-2 fill-current" />
                                </Button>
                            </motion.div>
                        ) : status === 'generating' ? (
                            <motion.div
                                key="generating"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="w-full h-14 bg-slate-900 text-white rounded-xl flex items-center justify-center gap-2 font-bold shadow-inner"
                            >
                                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                                <span>Building Slides...</span>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="space-y-3"
                            >
                                <Button
                                    onClick={handleDownload}
                                    className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-xl shadow-emerald-200 text-lg animate-[pulse_2s_infinite]"
                                >
                                    DOWNLOAD .PPTX <Download className="w-5 h-5 ml-2" />
                                </Button>
                                <button
                                    onClick={() => setStatus('idle')}
                                    className="w-full py-2 text-xs font-bold text-slate-400 uppercase hover:text-indigo-600"
                                >
                                    Create Another
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
