import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, Download, Loader2, FileType, AlertTriangle, CloudLightning, Settings2, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import type { PlaybookProConfig } from '../../types/playbook';

// Worker Import (Vite compatible)
import ProWorker from '../../workers/playbook-pro.worker?worker';

interface PlaybookProProps {
    isActive: boolean;
}

export const PlaybookPro = ({ isActive }: PlaybookProProps) => {
    // State Machine: 'idle' | 'analyzing' | 'processing' | 'success' | 'error' | 'large_file_warning'
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'processing' | 'success' | 'error' | 'large_file_warning'>('idle');
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Hybrid Fallback Config
    const MAX_LOCAL_SIZE = 2 * 1024 * 1024; // 2MB Limit

    // Comprehensive Configuration
    const [config, setConfig] = useState<PlaybookProConfig>({
        // 1. Document Structure
        pageSize: 'a4',
        orientation: 'portrait',
        margins: 'normal',

        // 2. Typography
        fontFamily: 'times',
        fontSize: 12,
        lineSpacing: '2.0',
        alignment: 'left',

        // 3. Structure & References
        addPageNumbers: true,
        autoToc: true,
        citationStyle: 'apa',

        // 4. Advanced
        imageAlignment: 'center',
    });

    const workerRef = useRef<Worker | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Initialize Worker
        workerRef.current = new ProWorker();

        workerRef.current.onmessage = (e) => {
            const { status, blob, message } = e.data;
            if (status === 'success') {
                setResultBlob(blob);
                setStatus('success');
            } else if (status === 'error') {
                setStatus('error');
                alert(`Error: ${message}`);
            }
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setStatus('analyzing');

            setTimeout(() => {
                if (selectedFile.size > MAX_LOCAL_SIZE) {
                    setStatus('large_file_warning');
                } else {
                    setStatus('idle');
                }
            }, 800);
        }
    };

    const handleProcess = () => {
        if (!file || !workerRef.current) return;

        setStatus('processing');
        setProgress(0);

        // Simulate progress for UX
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) {
                    clearInterval(interval);
                    return 90;
                }
                return prev + 10;
            });
        }, 100);

        // Send to Worker
        workerRef.current.postMessage({
            file,
            config
        });
    };

    const handleServerProcess = async () => {
        if (!file) return;

        setStatus('processing');
        setProgress(0);

        // Simulate upload progress
        const interval = setInterval(() => {
            setProgress(prev => (prev < 80 ? prev + 5 : prev));
        }, 200);

        try {
            // Convert file to base64
            const reader = new FileReader();
            reader.readAsDataURL(file);

            await new Promise((resolve) => {
                reader.onload = resolve;
            });

            const base64File = (reader.result as string).split(',')[1];

            const response = await fetch('/api/format-document', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    file: base64File,
                    config: config
                })
            });

            if (!response.ok) throw new Error('Cloud processing failed');

            const blob = await response.blob();
            clearInterval(interval);
            setProgress(100);
            setResultBlob(blob);
            setStatus('success');

        } catch (error) {
            console.error(error);
            clearInterval(interval);
            setStatus('error');
            alert("Cloud Processing Error: Please try a smaller file.");
        }
    };

    const handleDownload = () => {
        if (!resultBlob) return;
        const url = URL.createObjectURL(resultBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Formatted_${file?.name.replace(/\.[^/.]+$/, "")}.docx`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const reset = () => {
        setFile(null);
        setResultBlob(null);
        setStatus('idle');
        setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (!isActive) return null;

    return (
        <div className="w-full max-w-3xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 min-h-[600px] flex flex-col relative">

            {/* Header / Title */}
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Document Formatter</h2>
                    <p className="text-xs text-slate-500 font-medium">Zero-Lag. Local Privacy. University Standard.</p>
                </div>
                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shadow-sm">
                    <FileText className="w-5 h-5" />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-8 flex flex-col items-center justify-center relative">

                <AnimatePresence mode="wait">

                    {/* LARGE FILE WARNING MODAL (HYBRID FALLBACK) */}
                    {status === 'large_file_warning' && (
                        <motion.div
                            key="warning"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
                        >
                            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-6 shadow-lg shadow-amber-100 animate-pulse">
                                <AlertTriangle className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Large Document Detected</h3>
                            <p className="text-slate-500 text-sm mb-8 max-w-sm">
                                To prevent device slowdown, we need to route this document to our secure high-speed servers.
                            </p>

                            <div className="space-y-3 w-full max-w-xs">
                                <Button
                                    onClick={handleServerProcess}
                                    className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xl shadow-amber-200 flex items-center justify-center gap-2"
                                >
                                    <CloudLightning className="w-5 h-5" />
                                    Route to Secure Cloud
                                </Button>
                                <button onClick={reset} className="text-xs font-bold text-slate-400 uppercase hover:text-slate-600">
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* IDLE / FILE SELECTED STATE */}
                    {(status === 'idle' || status === 'analyzing') && (
                        <motion.div
                            key="input"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="w-full space-y-6"
                        >
                            {!file ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 rounded-2xl h-48 flex flex-col items-center justify-center cursor-pointer transition-all group"
                                >
                                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".docx,.txt" />
                                    <div className="w-12 h-12 bg-slate-50 group-hover:bg-white rounded-full flex items-center justify-center text-slate-400 group-hover:text-emerald-500 shadow-sm mb-3 transition-colors">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-slate-900">Drop Document Here</h3>
                                    <p className="text-slate-400 text-xs mt-1">Supports .docx and .txt</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Selected File Card */}
                                    <div className="flex items-center gap-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-emerald-600 shadow-sm">
                                            {status === 'analyzing' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileType className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-900 truncate text-sm">{file.name}</p>
                                            <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB • Ready</p>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={reset} className="text-slate-400 hover:text-red-500 h-8">
                                            Remove
                                        </Button>
                                    </div>

                                    {/* Configuration Form */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                             <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Formatting Rules</h3>
                                             <button
                                                onClick={() => setShowAdvanced(!showAdvanced)}
                                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                             >
                                                {showAdvanced ? 'Hide Advanced' : 'Show Advanced'} <Settings2 className="w-3 h-3" />
                                             </button>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {/* Core Typography */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Font Family</label>
                                                <div className="relative">
                                                    <select
                                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 appearance-none"
                                                        value={config.fontFamily}
                                                        onChange={(e) => setConfig({...config, fontFamily: e.target.value as any})}
                                                    >
                                                        <option value="times">Times New Roman</option>
                                                        <option value="arial">Arial</option>
                                                        <option value="calibri">Calibri</option>
                                                    </select>
                                                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Size (pt)</label>
                                                <div className="relative">
                                                    <select
                                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 appearance-none"
                                                        value={config.fontSize}
                                                        onChange={(e) => setConfig({...config, fontSize: parseInt(e.target.value)})}
                                                    >
                                                        <option value="10">10 pt</option>
                                                        <option value="11">11 pt</option>
                                                        <option value="12">12 pt</option>
                                                    </select>
                                                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Spacing</label>
                                                <div className="relative">
                                                    <select
                                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 appearance-none"
                                                        value={config.lineSpacing}
                                                        onChange={(e) => setConfig({...config, lineSpacing: e.target.value as any})}
                                                    >
                                                        <option value="1.0">1.0 (Single)</option>
                                                        <option value="1.5">1.5 (Standard)</option>
                                                        <option value="2.0">2.0 (Double)</option>
                                                    </select>
                                                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Structure Toggles */}
                                        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-slate-700">Auto-TOC</label>
                                                <button
                                                    onClick={() => setConfig({...config, autoToc: !config.autoToc})}
                                                    className={`relative w-8 h-4 rounded-full transition-colors duration-200 focus:outline-none ${config.autoToc ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                >
                                                    <span className={`inline-block w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 mt-0.5 ml-0.5 ${config.autoToc ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-slate-700">Page Numbers</label>
                                                <button
                                                    onClick={() => setConfig({...config, addPageNumbers: !config.addPageNumbers})}
                                                    className={`relative w-8 h-4 rounded-full transition-colors duration-200 focus:outline-none ${config.addPageNumbers ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                >
                                                    <span className={`inline-block w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 mt-0.5 ml-0.5 ${config.addPageNumbers ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Advanced Settings */}
                                        <AnimatePresence>
                                            {showAdvanced && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden space-y-3 pt-2 border-t border-slate-100"
                                                >
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Margins</label>
                                                            <div className="relative">
                                                                <select
                                                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 appearance-none"
                                                                    value={config.margins}
                                                                    onChange={(e) => setConfig({...config, margins: e.target.value as any})}
                                                                >
                                                                    <option value="normal">Normal (1")</option>
                                                                    <option value="narrow">Narrow (0.5")</option>
                                                                    <option value="wide">Wide (1.5")</option>
                                                                </select>
                                                                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Citation Style</label>
                                                            <div className="relative">
                                                                <select
                                                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 appearance-none"
                                                                    value={config.citationStyle}
                                                                    onChange={(e) => setConfig({...config, citationStyle: e.target.value as any})}
                                                                >
                                                                    <option value="apa">APA 7</option>
                                                                    <option value="mla">MLA 9</option>
                                                                    <option value="harvard">Harvard</option>
                                                                    <option value="chicago">Chicago</option>
                                                                </select>
                                                                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Orientation</label>
                                                            <div className="relative">
                                                                <select
                                                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 appearance-none"
                                                                    value={config.orientation}
                                                                    onChange={(e) => setConfig({...config, orientation: e.target.value as any})}
                                                                >
                                                                    <option value="portrait">Portrait</option>
                                                                    <option value="landscape">Landscape</option>
                                                                </select>
                                                                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Action Button */}
                                        <Button
                                            onClick={handleProcess}
                                            className="w-full h-12 text-base font-black bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 mt-2"
                                        >
                                            FORMAT DOCUMENT
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* PROCESSING STATE */}
                    {status === 'processing' && (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex flex-col items-center text-center w-full"
                        >
                            <div className="relative w-20 h-20 mb-6">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100" />
                                    <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={201} strokeDashoffset={201 - (201 * progress) / 100} className="text-emerald-500 transition-all duration-300 ease-out" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="font-bold text-emerald-600 text-lg">{progress}%</span>
                                </div>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mb-2">Processing...</h3>
                            <p className="text-slate-500 text-xs max-w-xs">Applying academic standards and generating Table of Contents.</p>
                        </motion.div>
                    )}

                    {/* SUCCESS STATE */}
                    {status === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center text-center w-full"
                        >
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6 shadow-lg shadow-emerald-200 animate-[bounce_1s_infinite]">
                                <CheckCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">Ready to Print</h3>
                            <p className="text-slate-500 text-xs mb-8">Your document has been perfectly formatted.</p>

                            <Button
                                onClick={handleDownload}
                                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xl shadow-emerald-200 flex items-center justify-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Download Formatted .docx
                            </Button>

                            <button onClick={reset} className="mt-6 text-xs font-bold text-slate-400 hover:text-slate-600">
                                Format Another Document
                            </button>
                        </motion.div>
                    )}

                </AnimatePresence>

            </div>
        </div>
    );
};
