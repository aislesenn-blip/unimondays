import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, Download, Loader2, CloudLightning, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, Info, GraduationCap, Briefcase } from 'lucide-react';
import { Button } from '../ui/Button';
import type { PlaybookProConfig, PlaybookXConfig } from '../../types/playbook';

// Worker Import (Vite compatible)
import ProWorker from '../../workers/playbook-pro.worker?worker';
import XWorker from '../../workers/playbook-x.worker?worker';

interface PlaybookProProps {
    isActive: boolean;
}

export const PlaybookPro = ({ isActive }: PlaybookProProps) => {
    // State Machine
    const [status, setStatus] = useState<'idle' | 'bucket_selection' | 'editor' | 'processing' | 'success' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [editorContent, setEditorContent] = useState('');
    const [bucket, setBucket] = useState<'research' | 'essay' | 'assignment' | 'ppt' | null>(null);

    // Configuration
    const [config, setConfig] = useState<PlaybookProConfig>({
        preset: 'academic',
        pageSize: 'a4',
        orientation: 'portrait',
        margins: 'normal',
        fontFamily: 'times',
        fontSize: 12,
        lineSpacing: '1.5',
        alignment: 'left',
        addPageNumbers: true,
        autoToc: true,
        citationStyle: 'apa',
        imageAlignment: 'center',
    });

    const proWorkerRef = useRef<Worker | null>(null);
    const xWorkerRef = useRef<Worker | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        proWorkerRef.current = new ProWorker();
        proWorkerRef.current.onmessage = (e) => handleWorkerMessage(e);

        xWorkerRef.current = new XWorker();
        xWorkerRef.current.onmessage = (e) => handleWorkerMessage(e);

        return () => {
            proWorkerRef.current?.terminate();
            xWorkerRef.current?.terminate();
        };
    }, []);

    const handleWorkerMessage = (e: MessageEvent) => {
        const { status, blob, message } = e.data;
        if (status === 'success') {
            setResultBlob(blob);
            setStatus('success');
        } else if (status === 'error') {
            setStatus('error');
            alert(`Error: ${message}`);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const selectedFile = e.target.files[0];

            // Extract text for editor
            const text = await selectedFile.text();
            // Basic cleaning: wrap lines in divs for contentEditable
            const htmlContent = text.split('\n').map(line => line.trim() ? `<div>${line}</div>` : '<div><br></div>').join('');

            setStatus('bucket_selection');

            // Defer editor content setting until editor renders
            setTimeout(() => {
                if (editorRef.current) {
                    editorRef.current.innerHTML = htmlContent;
                }
            }, 100);
        }
    };

    const handleBucketSelect = (selectedBucket: 'research' | 'essay' | 'assignment' | 'ppt') => {
        setBucket(selectedBucket);
        if (selectedBucket === 'research') {
            setConfig({ ...config, preset: 'academic', margins: 'normal', fontFamily: 'times', lineSpacing: '2.0', citationStyle: 'apa' });
        } else if (selectedBucket === 'essay') {
            setConfig({ ...config, preset: 'essay', margins: 'wide', fontFamily: 'times', lineSpacing: '1.5', citationStyle: 'mla' });
        } else if (selectedBucket === 'assignment') {
            setConfig({ ...config, preset: 'corporate', margins: 'narrow', fontFamily: 'arial', lineSpacing: '1.5' });
        } else if (selectedBucket === 'ppt') {
            setConfig({ ...config, preset: 'corporate' });
        }
        setStatus('editor');
    };

    // WYSIWYG Actions
    const execCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (editorRef.current) editorRef.current.focus();
    };

    const handleProcess = () => {
        setStatus('processing');
        setProgress(0);
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) { clearInterval(interval); return 90; }
                return prev + 10;
            });
        }, 100);

        // Get content
        const content = editorRef.current ? editorRef.current.innerText : ''; // For PPT/Simple text
        const htmlContent = editorRef.current ? editorRef.current.innerHTML : '';

        if (bucket === 'ppt') {
            // Use XWorker for PPT
            if (!xWorkerRef.current) return;
            const xConfig: PlaybookXConfig = {
                aspectRatio: '16x9',
                theme: 'corporate',
                maxBulletsPerSlide: 7,
                autoSplitLongText: true,
                addSpeakerNotes: true,
                addSlideNumbers: true,
                exportFormat: 'pptx',
                includeHandouts: false
            };
            xWorkerRef.current.postMessage({ text: content, config: xConfig });
        } else {
            // Use ProWorker for Documents (Offline Mode)
            if (!proWorkerRef.current) return;
            // Strip HTML for now or handle in worker. Sending raw text for robustness in this demo.
            // But we want to keep structure.
            // Let's send the text content but let the worker handle it.
            // Actually, ProWorker expects { file, config }.
            // We'll send the string as 'file'.
            proWorkerRef.current.postMessage({
                file: htmlContent, // Send HTML, worker will need to strip it or we strip it here
                config,
                isHtml: true // Flag for worker
            });
        }
    };

    const handleServerProcess = async (content: string) => {
        // Fallback or Heavy Load logic - kept for architecture completeness
        try {
            const response = await fetch('/api/format-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    html: content,
                    config,
                    bucket
                })
            });

            if (!response.ok) throw new Error('Processing failed');

            const blob = await response.blob();
            setResultBlob(blob);
            setStatus('success');
        } catch (error) {
            console.error(error);
            setStatus('error');
            alert("Processing Error: " + error);
        }
    };

    const handleDownload = (format: 'docx' | 'pdf' | 'pptx') => {
        if (!resultBlob) return;
        if (format === 'pdf') {
            alert("PDF generation requires cloud conversion libraries. Downloading as editable file instead.");
            // Fallback
            const ext = bucket === 'ppt' ? 'pptx' : 'docx';
            const url = URL.createObjectURL(resultBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Formatted_${bucket}.${ext}`;
            a.click();
            return;
        }

        const ext = bucket === 'ppt' ? 'pptx' : 'docx';

        const url = URL.createObjectURL(resultBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Formatted_${bucket}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const reset = () => {
        setResultBlob(null);
        setStatus('idle');
        setProgress(0);
        setBucket(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (!isActive) return null;

    return (
        <div className="w-full max-w-5xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 min-h-[700px] flex flex-col relative">

            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <FileText className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-slate-900 tracking-tight">Playbook Editor</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            {status === 'editor' ? `Editing: ${bucket?.toUpperCase()}` : 'Document Studio'}
                        </p>
                    </div>
                </div>
                {status === 'editor' && (
                    <Button onClick={handleProcess} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-md shadow-emerald-100">
                        {bucket === 'ppt' ? 'GENERATE SLIDES' : 'GENERATE DOC'}
                    </Button>
                )}
            </div>

            <div className="flex-1 relative flex flex-col">
                <AnimatePresence mode="wait">

                    {/* 1. UPLOAD STATE */}
                    {status === 'idle' && (
                        <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
                            <div onClick={() => fileInputRef.current?.click()} className="w-full max-w-md border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 rounded-2xl h-64 flex flex-col items-center justify-center cursor-pointer transition-all group">
                                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".docx,.txt" />
                                <div className="w-16 h-16 bg-slate-50 group-hover:bg-white rounded-full flex items-center justify-center text-slate-400 group-hover:text-emerald-500 shadow-sm mb-4 transition-colors"><Upload className="w-7 h-7" /></div>
                                <h3 className="font-bold text-slate-900">Upload Document</h3>
                                <p className="text-slate-400 text-sm mt-1">Supports .docx and .txt</p>
                            </div>
                        </motion.div>
                    )}

                    {/* 2. BUCKET SELECTION */}
                    {status === 'bucket_selection' && (
                        <motion.div key="bucket" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-900">What are you making?</h3>
                                <p className="text-slate-500">We'll set the perfect margins and rules for you.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                                {[
                                    { id: 'research', label: 'Research Paper', icon: GraduationCap, color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                                    { id: 'essay', label: 'Standard Essay', icon: FileText, color: 'bg-slate-50 border-slate-200 text-slate-700' },
                                    { id: 'assignment', label: 'Assignment', icon: Briefcase, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                                    { id: 'ppt', label: 'Presentation', icon: CloudLightning, color: 'bg-purple-50 border-purple-200 text-purple-700' }
                                ].map((b) => (
                                    <button key={b.id} onClick={() => handleBucketSelect(b.id as any)} className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all hover:scale-105 active:scale-95 ${b.color}`}>
                                        <b.icon className="w-8 h-8 mb-3" />
                                        <span className="font-bold text-sm">{b.label}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* 3. WYSIWYG EDITOR */}
                    {status === 'editor' && (
                        <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col h-full bg-slate-50/50">

                            {/* Toolbar */}
                            <div className="bg-white border-b border-slate-200 p-2 flex items-center gap-2 overflow-x-auto sticky top-0 z-10 shadow-sm px-4">
                                <div className="flex bg-slate-100 rounded-lg p-1">
                                    <button onClick={() => execCmd('justifyLeft')} className="p-2 hover:bg-white rounded-md text-slate-600 transition-all" title="Align Left"><AlignLeft className="w-4 h-4" /></button>
                                    <button onClick={() => execCmd('justifyCenter')} className="p-2 hover:bg-white rounded-md text-slate-600 transition-all" title="Align Center"><AlignCenter className="w-4 h-4" /></button>
                                    <button onClick={() => execCmd('justifyRight')} className="p-2 hover:bg-white rounded-md text-slate-600 transition-all" title="Align Right"><AlignRight className="w-4 h-4" /></button>
                                    <button onClick={() => execCmd('justifyFull')} className="p-2 hover:bg-white rounded-md text-slate-600 transition-all" title="Justify"><AlignJustify className="w-4 h-4" /></button>
                                </div>
                                <div className="w-px h-6 bg-slate-200 mx-1" />
                                <div className="flex bg-slate-100 rounded-lg p-1">
                                    <button onClick={() => execCmd('insertUnorderedList')} className="p-2 hover:bg-white rounded-md text-slate-600 transition-all" title="Bulleted List"><List className="w-4 h-4" /></button>
                                    <button onClick={() => execCmd('insertOrderedList')} className="p-2 hover:bg-white rounded-md text-slate-600 transition-all" title="Numbered List"><ListOrdered className="w-4 h-4" /></button>
                                </div>
                                <div className="w-px h-6 bg-slate-200 mx-1" />
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400">LINE HEIGHT</span>
                                    <select
                                        className="bg-slate-100 text-xs font-bold text-slate-700 p-2 rounded-lg border-none focus:ring-0 cursor-pointer h-9"
                                        onChange={(e) => setConfig({...config, lineSpacing: e.target.value as any})}
                                        value={config.lineSpacing}
                                    >
                                        <option value="1.0">1.0</option>
                                        <option value="1.5">1.5</option>
                                        <option value="2.0">2.0</option>
                                    </select>
                                </div>
                            </div>

                            {/* Editor Surface */}
                            <div className="flex-1 relative flex overflow-hidden">
                                <div className="flex-1 relative bg-white m-4 rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                                    {/* Instructions */}
                                    <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100 text-[10px] font-bold text-indigo-800 flex items-center justify-between">
                                        <span>PROTOCOL: Add # before Main Headings. Use Toolbar to format.</span>
                                        <span className="opacity-70 flex items-center gap-1"><Info className="w-3 h-3" /> Highlight text to edit</span>
                                    </div>

                                    {/* ContentEditable Div */}
                                    <div
                                        ref={editorRef}
                                        contentEditable
                                        className="flex-1 w-full p-8 outline-none font-serif text-slate-800 leading-relaxed text-sm selection:bg-indigo-100 overflow-y-auto"
                                        style={{
                                            lineHeight: config.lineSpacing,
                                            fontFamily: config.fontFamily === 'times' ? '"Times New Roman", Times, serif' : config.fontFamily === 'arial' ? 'Arial, sans-serif' : 'Calibri, sans-serif',
                                            fontSize: `${config.fontSize}pt`
                                        }}
                                        spellCheck={false}
                                    />

                                    {/* Empty State Placeholder */}
                                    {(!editorRef.current || editorRef.current.innerText.trim() === '') && (
                                        <div className="absolute top-20 left-8 text-slate-300 pointer-events-none text-sm font-serif">
                                            Type here, or start with '#' for a Heading...
                                        </div>
                                    )}
                                </div>

                                {/* Journey Tracker Sidebar */}
                                <div className="hidden md:flex w-48 flex-col p-4 space-y-6 border-l border-slate-100 bg-white">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs"><CheckCircle className="w-4 h-4" /> Upload</div>
                                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs"><CheckCircle className="w-4 h-4" /> {bucket ? bucket.charAt(0).toUpperCase() + bucket.slice(1) : 'Bucket'}</div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-slate-900 font-bold text-xs"><div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[8px]">3</div> Editor</div>
                                        <div className="pl-6 text-[10px] text-slate-400 space-y-2">
                                            <p>• Add Headings (#)</p>
                                            <p>• Fix Spacing</p>
                                            <p>• Check Alignment</p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100">
                                        <div className="flex items-center gap-2 text-slate-400 font-bold text-xs"><div className="w-4 h-4 rounded-full border-2 border-slate-200 flex items-center justify-center text-[8px]">4</div> Generate</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* 4. PROCESSING */}
                    {status === 'processing' && (
                        <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                            <h3 className="font-black text-slate-900">Formatting your {bucket?.toUpperCase()}...</h3>
                            <p className="text-slate-500 text-xs">Applying standard margins and TOC.</p>
                        </motion.div>
                    )}

                    {/* 5. SUCCESS */}
                    {status === 'success' && (
                        <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-center space-y-6 p-8">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-lg animate-bounce"><CheckCircle className="w-10 h-10" /></div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 mb-2">Ready to Submit</h3>
                                <p className="text-slate-500 text-sm">Your document is perfectly formatted.</p>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 w-full max-w-sm border border-slate-100 text-left">
                                <h4 className="text-xs font-black text-slate-900 uppercase mb-2">QC Summary</h4>
                                <ul className="text-xs text-slate-600 space-y-1">
                                    <li>• Processed {bucket?.toUpperCase()} Rules</li>
                                    {bucket !== 'ppt' && <li>• Generated Table of Contents</li>}
                                    <li>• Fixed Margins & Spacing</li>
                                </ul>
                            </div>

                            <div className="flex gap-3 w-full max-w-sm">
                                {bucket === 'ppt' ? (
                                    <Button onClick={() => handleDownload('pptx')} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"><Download className="w-4 h-4 mr-2" /> .PPTX</Button>
                                ) : (
                                    <Button onClick={() => handleDownload('docx')} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"><Download className="w-4 h-4 mr-2" /> .DOCX</Button>
                                )}
                                <Button onClick={() => handleDownload('pdf')} className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold"><Download className="w-4 h-4 mr-2" /> .PDF</Button>
                            </div>
                            <button onClick={reset} className="text-xs font-bold text-slate-400 uppercase hover:text-slate-600">Start Over</button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
};
