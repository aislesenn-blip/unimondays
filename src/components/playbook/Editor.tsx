import { useState, useRef, useEffect } from 'react';
import { FloatingToolbar } from './FloatingToolbar';
import { LiteAssistant } from './LiteAssistant';
import { Button } from '../ui/Button';
import {
    LayoutTemplate,
    ListOrdered,
    FileType,
    Sparkles,
    X,
    Check,
    ScanText,
    Loader2,
    FileText,
    Printer,
    Menu
} from 'lucide-react';
import { generateDocx, generatePdf } from '../../services/playbook/fileHandler';
import { useNavigate } from 'react-router-dom';

export const Editor = () => {
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // -- State --
    const [isLiteReady, setIsLiteReady] = useState(false);
    const [formatStyle, setFormatStyle] = useState<'standard' | 'apa' | 'mla'>('standard');
    const [showCoverModal, setShowCoverModal] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Cover Page Form State
    const [coverData, setCoverData] = useState({ title: '', name: '', regNo: '', course: '' });

    // -- Web Worker --
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        // Initialize Worker
        workerRef.current = new Worker(new URL('../../workers/ocrWorker.ts', import.meta.url), { type: 'module' });

        workerRef.current.onmessage = (e) => {
            const { status, text, error } = e.data;
            if (status === 'success') {
                document.execCommand('insertText', false, text);
                setIsScanning(false);
            } else {
                setScanError(error || "Scanning failed.");
                setIsScanning(false);
            }
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    // -- Handlers --

    const handleFormat = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    };

    const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        setScanError(null);

        const reader = new FileReader();
        reader.onload = () => {
             // Send image data to worker
             workerRef.current?.postMessage({ image: reader.result });
        };
        reader.readAsDataURL(file);

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const cancelOCR = () => {
        setIsScanning(false);
        // Worker termination/restart logic could go here if deeply cancelled
    };

    const insertCoverPage = () => {
        if (!editorRef.current) return;

        const { title, name, regNo, course } = coverData;

        // Simple Modern Template
        const coverHTML = `
            <div class="cover-page break-after-page flex flex-col items-center justify-center min-h-[297mm] text-center p-12 border-b-2 border-slate-100 mb-8" contenteditable="false">
                <div class="mb-12">
                    <h1 class="text-4xl font-bold uppercase tracking-widest text-slate-900 mb-4">${course}</h1>
                    <div class="w-32 h-1 bg-emerald-500 mx-auto"></div>
                </div>

                <div class="flex-1 flex flex-col justify-center space-y-8">
                    <h2 class="text-5xl font-black text-slate-800 leading-tight">${title || 'Untitled Document'}</h2>
                    <p class="text-xl text-slate-500 italic">Submitted by</p>
                    <div>
                        <p class="text-2xl font-bold text-slate-900">${name}</p>
                        <p class="text-lg font-mono text-slate-600 mt-2">${regNo}</p>
                    </div>
                </div>

                <div class="mt-12 text-slate-400 text-sm">
                    ${new Date().toLocaleDateString()}
                </div>
            </div>
            <br />
        `;

        // Prepend to editor
        const currentContent = editorRef.current.innerHTML;
        editorRef.current.innerHTML = coverHTML + currentContent;
        setShowCoverModal(false);
    };

    const insertTOC = () => {
        if (!editorRef.current) return;

        const headings = editorRef.current.querySelectorAll('h1, h2');
        if (headings.length === 0) {
            alert("No headings found. Add H1 or H2 headings first.");
            return;
        }

        let tocHTML = `
            <div class="toc-container my-8 p-6 bg-slate-50 rounded-xl border border-slate-200" contenteditable="false">
                <h3 class="text-xl font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Table of Contents</h3>
                <ul class="space-y-2">
        `;

        headings.forEach((h, index) => {
            const text = h.textContent || '';
            const indent = h.tagName === 'H2' ? 'ml-6' : '';
            h.id = `toc-${index}`;
            tocHTML += `<li class="${indent} flex items-center justify-between text-slate-700">
                <span>${text}</span>
                <span class="border-b border-dotted border-slate-300 flex-1 mx-2"></span>
                <span class="font-mono text-slate-400">Pg ?</span>
            </li>`;
        });

        tocHTML += `</ul></div><br />`;

        editorRef.current.focus();

        // Ensure insertion at the end or current cursor, preferably end if nothing selected
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            // Check if selection is inside editor
            if (editorRef.current.contains(selection.anchorNode)) {
                 document.execCommand('insertHTML', false, tocHTML);
            } else {
                 // Append to end
                 editorRef.current.innerHTML += tocHTML;
            }
        } else {
            editorRef.current.innerHTML += tocHTML;
        }
    };

    const handleExport = async (type: 'pdf' | 'docx' | 'print') => {
        setIsExporting(true);
        setShowExportMenu(false);
        try {
            const content = editorRef.current?.innerHTML || '';
            if (!content) {
                alert("Document is empty.");
                return;
            }

            if (type === 'pdf') {
                const blob = await generatePdf(content);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = "Playbook_Document.pdf";
                a.click();
            } else if (type === 'docx') {
                const blob = await generateDocx(content);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = "Playbook_Document.docx";
                a.click();
            } else if (type === 'print') {
                // Navigate to print checkout
                 navigate('/print', { state: { fromPlaybook: true } });
            }

        } catch (e) {
            console.error(e);
            alert("Export failed.");
        } finally {
            setIsExporting(false);
        }
    };


    return (
        <div className="flex flex-col items-center w-full relative pb-40">

            {/* Hidden File Input for OCR */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleOCR}
            />

            {/* OCR Loading Overlay */}
            {isScanning && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
                    <h3 className="text-xl font-bold">Scanning Document...</h3>
                    <p className="text-slate-400 mb-6">Please wait while we extract the text.</p>
                    <Button variant="outline" className="text-white border-white hover:bg-white/10" onClick={cancelOCR}>
                        Cancel
                    </Button>
                </div>
            )}

            {/* Error Toast (Simple) */}
            {scanError && (
                <div className="fixed top-20 right-4 bg-red-500 text-white p-4 rounded-xl shadow-lg z-[100] animate-in slide-in-from-right duration-300 flex items-center gap-3">
                     <span>{scanError}</span>
                     <button onClick={() => setScanError(null)}><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Top Export Button (Floating) */}
            <div className="fixed top-20 right-4 z-40">
                <div className="relative">
                    <Button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="bg-slate-900 text-white shadow-xl hover:bg-slate-800 rounded-full px-6"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Menu className="w-4 h-4 mr-2" />}
                        Export & Print
                    </Button>

                    {showExportMenu && (
                        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
                             <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium text-slate-700">
                                 <FileText className="w-4 h-4 text-red-500" /> Download PDF
                             </button>
                             <button onClick={() => handleExport('docx')} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium text-slate-700">
                                 <FileText className="w-4 h-4 text-blue-500" /> Download Word
                             </button>
                             <div className="h-px bg-slate-100 my-1"></div>
                             <button onClick={() => handleExport('print')} className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center gap-2 text-sm font-bold text-indigo-600">
                                 <Printer className="w-4 h-4" /> Send to Campus Print
                             </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Lite Mode Banner */}
            {!isLiteReady && (
                <div className="w-full px-4 mb-4 max-w-3xl mt-4">
                   <LiteAssistant isReady={isLiteReady} onReady={() => setIsLiteReady(true)} />
                </div>
            )}

            {/* A4 Canvas */}
            <div className={`
                w-full max-w-[210mm] bg-white shadow-2xl mx-auto min-h-[297mm] p-[25mm] relative outline-none text-slate-900 mb-10 transition-all duration-300
                ${formatStyle === 'apa' ? 'font-serif text-[12pt] leading-[2.0]' : ''}
                ${formatStyle === 'mla' ? 'font-serif text-[12pt] leading-[2.0]' : ''}
                ${formatStyle === 'standard' ? 'font-serif text-lg leading-relaxed' : ''}
            `}>

                <div
                    ref={editorRef}
                    contentEditable
                    className={`w-full h-full outline-none empty:before:content-['Start_typing...'] empty:before:text-slate-300 empty:before:pointer-events-none ${formatStyle === 'apa' ? 'indent-8' : ''}`}
                    spellCheck={false}
                    onInput={() => {}}
                    onPaste={(e) => {
                        e.preventDefault();
                        const text = e.clipboardData.getData('text/plain');
                        document.execCommand('insertText', false, text);
                    }}
                />

                <FloatingToolbar onFormat={handleFormat} />
            </div>

            {/* Bottom Action Bar (The "Menu") */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-700 shadow-2xl rounded-full p-2 flex items-center gap-1 z-[60] transition-all hover:scale-105 overflow-x-auto max-w-[90vw]">

                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-slate-800 rounded-xl transition-colors group min-w-[60px]">
                    <ScanText className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wide whitespace-nowrap">Scan Notes</span>
                </button>

                <div className="w-px h-8 bg-slate-700 mx-1"></div>

                <button onClick={() => setShowCoverModal(true)} className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-slate-800 rounded-xl transition-colors group min-w-[60px]">
                    <LayoutTemplate className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wide whitespace-nowrap">Cover Page</span>
                </button>

                <div className="w-px h-8 bg-slate-700 mx-1"></div>

                <div className="relative group">
                    <button className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-slate-800 rounded-xl transition-colors min-w-[60px]">
                        <FileType className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wide whitespace-nowrap">Magic Format</span>
                    </button>
                    {/* Format Dropdown (Hover) */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-48 bg-slate-800 rounded-xl shadow-xl overflow-hidden hidden group-hover:block border border-slate-700 z-[70]">
                         <button onClick={() => setFormatStyle('standard')} className={`w-full text-left px-4 py-2 text-xs font-bold ${formatStyle === 'standard' ? 'text-emerald-400 bg-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>Standard</button>
                         <button onClick={() => setFormatStyle('apa')} className={`w-full text-left px-4 py-2 text-xs font-bold ${formatStyle === 'apa' ? 'text-emerald-400 bg-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>University Standard</button>
                         <button onClick={() => setFormatStyle('mla')} className={`w-full text-left px-4 py-2 text-xs font-bold ${formatStyle === 'mla' ? 'text-emerald-400 bg-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>Formal Report</button>
                    </div>
                </div>

                <div className="w-px h-8 bg-slate-700 mx-1"></div>

                <button onClick={insertTOC} className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-slate-800 rounded-xl transition-colors group min-w-[60px]">
                    <ListOrdered className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wide whitespace-nowrap">Insert TOC</span>
                </button>

            </div>

            {/* Cover Page Modal */}
            {showCoverModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative animate-in zoom-in duration-200">
                        <button onClick={() => setShowCoverModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                            <X className="w-6 h-6" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-4">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Create Cover Page</h3>
                            <p className="text-sm text-slate-500">Auto-generate a university standard cover.</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assignment Title</label>
                                <input
                                    type="text"
                                    value={coverData.title}
                                    onChange={e => setCoverData({...coverData, title: e.target.value})}
                                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="e.g. History of Architecture"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Student Name</label>
                                <input
                                    type="text"
                                    value={coverData.name}
                                    onChange={e => setCoverData({...coverData, name: e.target.value})}
                                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reg No</label>
                                    <input
                                        type="text"
                                        value={coverData.regNo}
                                        onChange={e => setCoverData({...coverData, regNo: e.target.value})}
                                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="e.g. 2023-04-001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Code</label>
                                    <input
                                        type="text"
                                        value={coverData.course}
                                        onChange={e => setCoverData({...coverData, course: e.target.value})}
                                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="e.g. CS 101"
                                    />
                                </div>
                            </div>

                            <Button onClick={insertCoverPage} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-lg font-bold mt-2">
                                <Check className="w-5 h-5 mr-2" /> Generate Cover
                            </Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
