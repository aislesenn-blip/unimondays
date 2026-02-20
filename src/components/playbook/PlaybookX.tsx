import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Download, Sparkles, Wand2, Loader2, Settings2, Monitor } from 'lucide-react';
import { Button } from '../ui/Button';
import type { PlaybookXConfig } from '../../types/playbook';

// Worker Import
import XWorker from '../../workers/playbook-x.worker?worker';

interface PlaybookXProps {
    isActive: boolean;
}

export const PlaybookX = ({ isActive }: PlaybookXProps) => {
    const [text, setText] = useState(`# Introduction\nWelcome to Playbook X.\nThis tool generates slides instantly.\n\n# The Rules\nHeading 1 creates a new slide.\nParagraphs become bullet points.\nLong paragraphs are auto-split.\n\n# Features\nZero lag.\n100% Client-Side.\nDeterministic Formatting.`);
    const [status, setStatus] = useState<'idle' | 'generating' | 'success'>('idle');
    const [pptBlob, setPptBlob] = useState<Blob | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Comprehensive Configuration
    const [config, setConfig] = useState<PlaybookXConfig>({
        aspectRatio: '16x9',
        theme: 'corporate',
        maxBulletsPerSlide: 7,
        autoSplitLongText: true,
        addSpeakerNotes: true,
        addSlideNumbers: true,
        exportFormat: 'pptx'
    });

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
                config // Send full config object
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
        <div className="w-full max-w-6xl mx-auto h-[700px] bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 flex flex-col md:flex-row relative">

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
            <div className="w-full md:w-96 bg-white flex flex-col z-10 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)]">

                {/* Configuration Area */}
                <div className="p-6 flex-1 space-y-6 overflow-y-auto">

                    {/* Visual Theme */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Visual Theme</label>
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { id: 'academic', name: 'Academic White', color: 'bg-slate-50 border-slate-200' },
                                { id: 'corporate', name: 'Corporate Blue', color: 'bg-blue-50 border-blue-200' },
                                { id: 'creative', name: 'Creative Purple', color: 'bg-purple-50 border-purple-200' },
                                { id: 'dark', name: 'Minimalist Dark', color: 'bg-slate-900 text-white border-slate-800' }
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setConfig({...config, theme: t.id as any})}
                                    className={`relative p-3 rounded-xl border-2 text-left transition-all ${config.theme === t.id ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-100 hover:border-slate-300'} ${t.color}`}
                                >
                                    <span className={`font-bold text-sm ${t.id === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.name}</span>
                                    {config.theme === t.id && (
                                        <div className="absolute top-2 right-2 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                                            <Sparkles className="w-2 h-2" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Settings */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                         <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                <Monitor className="w-3 h-3 text-slate-400" /> Aspect Ratio
                            </label>
                            <div className="flex bg-slate-100 rounded-lg p-1">
                                <button
                                    onClick={() => setConfig({...config, aspectRatio: '16x9'})}
                                    className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${config.aspectRatio === '16x9' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                                >16:9</button>
                                <button
                                    onClick={() => setConfig({...config, aspectRatio: '4x3'})}
                                    className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${config.aspectRatio === '4x3' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                                >4:3</button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                             <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Advanced Rules</h3>
                             <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                             >
                                {showAdvanced ? 'Hide' : 'Configure'} <Settings2 className="w-3 h-3" />
                             </button>
                        </div>

                        <AnimatePresence>
                            {showAdvanced && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden space-y-3"
                                >
                                     <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <label className="text-xs font-bold text-slate-700">Speaker Notes</label>
                                        <button
                                            onClick={() => setConfig({...config, addSpeakerNotes: !config.addSpeakerNotes})}
                                            className={`relative w-8 h-4 rounded-full transition-colors duration-200 focus:outline-none ${config.addSpeakerNotes ? 'bg-indigo-500' : 'bg-slate-300'}`}
                                        >
                                            <span className={`inline-block w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 mt-0.5 ml-0.5 ${config.addSpeakerNotes ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <label className="text-xs font-bold text-slate-700">Slide Numbers</label>
                                        <button
                                            onClick={() => setConfig({...config, addSlideNumbers: !config.addSlideNumbers})}
                                            className={`relative w-8 h-4 rounded-full transition-colors duration-200 focus:outline-none ${config.addSlideNumbers ? 'bg-indigo-500' : 'bg-slate-300'}`}
                                        >
                                            <span className={`inline-block w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 mt-0.5 ml-0.5 ${config.addSlideNumbers ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                     <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <label className="text-xs font-bold text-slate-700">Auto-Split Long Text</label>
                                        <button
                                            onClick={() => setConfig({...config, autoSplitLongText: !config.autoSplitLongText})}
                                            className={`relative w-8 h-4 rounded-full transition-colors duration-200 focus:outline-none ${config.autoSplitLongText ? 'bg-indigo-500' : 'bg-slate-300'}`}
                                        >
                                            <span className={`inline-block w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 mt-0.5 ml-0.5 ${config.autoSplitLongText ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
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
