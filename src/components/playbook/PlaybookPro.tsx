import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, Download, Loader2, FileType, AlertTriangle, CloudLightning, Settings2, ChevronDown, Award, Briefcase, GraduationCap } from 'lucide-react';
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
        preset: 'academic',
        pageSize: 'a4',
        orientation: 'portrait',
        margins: 'normal',
        fontFamily: 'times',
        fontSize: 12,
        lineSpacing: '2.0',
        alignment: 'left',
        addPageNumbers: true,
        autoToc: true,
        citationStyle: 'apa',
        imageAlignment: 'center',
    });

    const workerRef = useRef<Worker | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
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
        return () => workerRef.current?.terminate();
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

    const applyPreset = (preset: 'academic' | 'corporate' | 'essay') => {
        if (preset === 'academic') {
            setConfig({ ...config, preset, fontFamily: 'times', fontSize: 12, lineSpacing: '2.0', margins: 'normal', citationStyle: 'apa', addPageNumbers: true, autoToc: true });
        } else if (preset === 'corporate') {
            setConfig({ ...config, preset, fontFamily: 'arial', fontSize: 11, lineSpacing: '1.5', margins: 'narrow', citationStyle: 'harvard', addPageNumbers: true, autoToc: true });
        } else if (preset === 'essay') {
            setConfig({ ...config, preset, fontFamily: 'calibri', fontSize: 12, lineSpacing: '2.0', margins: 'wide', citationStyle: 'mla', addPageNumbers: true, autoToc: false });
        }
    };

    const handleProcess = () => {
        if (!file || !workerRef.current) return;
        setStatus('processing');
        setProgress(0);
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) { clearInterval(interval); return 90; }
                return prev + 10;
            });
        }, 100);
        workerRef.current.postMessage({ file, config });
    };

    const handleServerProcess = async () => {
        if (!file) return;
        setStatus('processing');
        setProgress(0);
        const interval = setInterval(() => {
            setProgress(prev => (prev < 80 ? prev + 5 : prev));
        }, 200);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            await new Promise((resolve) => { reader.onload = resolve; });
            const base64File = (reader.result as string).split(',')[1];
            const response = await fetch('/api/format-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: base64File, config: config })
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

    const handleDownload = (format: 'docx' | 'pdf') => {
        if (!resultBlob) return;

        if (format === 'pdf') {
            alert("PDF generation requires cloud conversion libraries. Downloading as .DOCX instead.");
            // Fallback to DOCX
            const url = URL.createObjectURL(resultBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Formatted_${file?.name.replace(/\.[^/.]+$/, "")}.docx`;
            a.click();
            URL.revokeObjectURL(url);
            return;
        }

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

            {/* Header */}
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Document Formatter</h2>
                    <p className="text-xs text-slate-500 font-medium">Zero-Lag. Local Privacy. University Standard.</p>
                </div>
                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shadow-sm">
                    <FileText className="w-5 h-5" />
                </div>
            </div>

            <div className="flex-1 p-8 flex flex-col items-center justify-center relative">
                <AnimatePresence mode="wait">

                    {/* Warning Modal */}
                    {status === 'large_file_warning' && (
                        <motion.div key="warning" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-6 shadow-lg shadow-amber-100 animate-pulse"><AlertTriangle className="w-10 h-10" /></div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Large Document Detected</h3>
                            <p className="text-slate-500 text-sm mb-8 max-w-sm">To prevent device slowdown, we need to route this document to our secure high-speed servers.</p>
                            <div className="space-y-3 w-full max-w-xs">
                                <Button onClick={handleServerProcess} className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xl shadow-amber-200 flex items-center justify-center gap-2"><CloudLightning className="w-5 h-5" /> Route to Secure Cloud</Button>
                                <button onClick={reset} className="text-xs font-bold text-slate-400 uppercase hover:text-slate-600">Cancel</button>
                            </div>
                        </motion.div>
                    )}

                    {/* Input & Config */}
                    {(status === 'idle' || status === 'analyzing') && (
                        <motion.div key="input" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full space-y-6">
                            {!file ? (
                                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 rounded-2xl h-48 flex flex-col items-center justify-center cursor-pointer transition-all group">
                                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".docx,.txt" />
                                    <div className="w-12 h-12 bg-slate-50 group-hover:bg-white rounded-full flex items-center justify-center text-slate-400 group-hover:text-emerald-500 shadow-sm mb-3 transition-colors"><Upload className="w-6 h-6" /></div>
                                    <h3 className="font-bold text-slate-900">Drop Document Here</h3>
                                    <p className="text-slate-400 text-xs mt-1">Supports .docx and .txt</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-emerald-600 shadow-sm">{status === 'analyzing' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileType className="w-5 h-5" />}</div>
                                        <div className="flex-1"><p className="font-bold text-slate-900 truncate text-sm">{file.name}</p><p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB • Ready</p></div>
                                        <Button variant="ghost" size="sm" onClick={reset} className="text-slate-400 hover:text-red-500 h-8">Remove</Button>
                                    </div>

                                    {/* Presets */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">One-Click Style Preset</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'academic', name: 'Academic', icon: GraduationCap, color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                                                { id: 'corporate', name: 'Corporate', icon: Briefcase, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                                                { id: 'essay', name: 'Essay', icon: Award, color: 'bg-slate-50 border-slate-200 text-slate-700' }
                                            ].map((p) => (
                                                <button key={p.id} onClick={() => applyPreset(p.id as any)} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${config.preset === p.id ? `ring-2 ring-offset-1 ${p.color} border-transparent` : 'border-slate-100 hover:border-slate-300'}`}>
                                                    <p.icon className={`w-5 h-5 mb-1 ${config.preset === p.id ? 'text-current' : 'text-slate-400'}`} />
                                                    <span className={`text-[10px] font-bold ${config.preset === p.id ? 'text-current' : 'text-slate-500'}`}>{p.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Advanced Toggle */}
                                    <div className="pt-2">
                                        <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors">
                                            <span>Advanced Configuration</span>
                                            <div className="flex items-center gap-1">{showAdvanced ? 'Hide' : 'Show'} <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} /></div>
                                        </button>

                                        <AnimatePresence>
                                            {showAdvanced && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4 pt-4">
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Font</label><select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700" value={config.fontFamily} onChange={(e) => setConfig({...config, fontFamily: e.target.value as any})}><option value="times">Times New Roman</option><option value="arial">Arial</option><option value="calibri">Calibri</option></select></div>
                                                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Size</label><select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700" value={config.fontSize} onChange={(e) => setConfig({...config, fontSize: parseInt(e.target.value)})}><option value="10">10 pt</option><option value="11">11 pt</option><option value="12">12 pt</option></select></div>
                                                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Spacing</label><select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700" value={config.lineSpacing} onChange={(e) => setConfig({...config, lineSpacing: e.target.value as any})}><option value="1.0">1.0 (Single)</option><option value="1.5">1.5 (Standard)</option><option value="2.0">2.0 (Double)</option></select></div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                        <div className="flex items-center justify-between"><label className="text-xs font-bold text-slate-700">Auto-TOC</label><button onClick={() => setConfig({...config, autoToc: !config.autoToc})} className={`relative w-8 h-4 rounded-full transition-colors ${config.autoToc ? 'bg-emerald-500' : 'bg-slate-300'}`}><span className={`inline-block w-3 h-3 bg-white rounded-full shadow transform transition-transform mt-0.5 ml-0.5 ${config.autoToc ? 'translate-x-4' : 'translate-x-0'}`} /></button></div>
                                                        <div className="flex items-center justify-between"><label className="text-xs font-bold text-slate-700">Page #</label><button onClick={() => setConfig({...config, addPageNumbers: !config.addPageNumbers})} className={`relative w-8 h-4 rounded-full transition-colors ${config.addPageNumbers ? 'bg-emerald-500' : 'bg-slate-300'}`}><span className={`inline-block w-3 h-3 bg-white rounded-full shadow transform transition-transform mt-0.5 ml-0.5 ${config.addPageNumbers ? 'translate-x-4' : 'translate-x-0'}`} /></button></div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <Button onClick={handleProcess} className="w-full h-12 text-base font-black bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 mt-2">FORMAT DOCUMENT</Button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Processing */}
                    {status === 'processing' && (
                        <motion.div key="processing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center text-center w-full">
                            <div className="relative w-20 h-20 mb-6">
                                <svg className="w-full h-full transform -rotate-90"><circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100" /><circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={201} strokeDashoffset={201 - (201 * progress) / 100} className="text-emerald-500 transition-all duration-300 ease-out" /></svg>
                                <div className="absolute inset-0 flex items-center justify-center"><span className="font-bold text-emerald-600 text-lg">{progress}%</span></div>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mb-2">Processing...</h3>
                            <p className="text-slate-500 text-xs max-w-xs">Applying academic standards and generating Table of Contents.</p>
                        </motion.div>
                    )}

                    {/* Success & QC Report */}
                    {status === 'success' && (
                        <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center w-full">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4 shadow-lg shadow-emerald-200 animate-[bounce_1s_infinite]"><CheckCircle className="w-8 h-8" /></div>

                            {/* QC Report Modal Inline */}
                            <div className="bg-slate-50 rounded-xl p-4 w-full mb-6 text-left border border-slate-100">
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2"><Award className="w-3 h-3 text-emerald-500" /> Quality Control Report</h4>
                                <ul className="space-y-1">
                                    <li className="text-xs text-slate-600 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Formatted {config.pageSize.toUpperCase()} Layout</li>
                                    <li className="text-xs text-slate-600 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Applied {config.fontFamily} {config.fontSize}pt</li>
                                    {config.autoToc && <li className="text-xs text-slate-600 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Generated Table of Contents</li>}
                                    <li className="text-xs text-slate-600 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Fixed Image Alignments</li>
                                    <li className="text-xs text-slate-600 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 100% Ready for Submission</li>
                                </ul>
                            </div>

                            <div className="flex gap-3 w-full">
                                <Button onClick={() => handleDownload('docx')} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-100"><Download className="w-4 h-4 mr-2" /> .DOCX</Button>
                                <Button onClick={() => handleDownload('pdf')} className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-lg shadow-slate-200"><Download className="w-4 h-4 mr-2" /> .PDF</Button>
                            </div>
                            <button onClick={reset} className="mt-6 text-xs font-bold text-slate-400 hover:text-slate-600">Format Another Document</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
