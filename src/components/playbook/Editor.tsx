import { useState, useRef } from 'react';
import { FloatingToolbar } from './FloatingToolbar';
import { LiteAssistant } from './LiteAssistant';
import { Button } from '../ui/Button';
import { createWorker } from 'tesseract.js';
import {
    LayoutTemplate,
    ListOrdered,
    FileType,
    Sparkles,
    X,
    Check,
    ScanText,
    Loader2
} from 'lucide-react';

export const Editor = () => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isLiteReady, setIsLiteReady] = useState(false);
    const [formatStyle, setFormatStyle] = useState<'standard' | 'apa' | 'mla'>('standard');
    const [showCoverModal, setShowCoverModal] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    // Cover Page Form State
    const [coverData, setCoverData] = useState({ title: '', name: '', regNo: '', course: '' });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFormat = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    };

    const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        try {
            const worker = await createWorker('eng');
            const { data: { text } } = await worker.recognize(file);
            await worker.terminate();

            // Insert text
            document.execCommand('insertText', false, text);
        } catch (error) {
            console.error(error);
            alert("OCR Failed. Please try again.");
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
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
            // Add ID to heading for linking (if we wanted anchors, but for print usually just list)
            h.id = `toc-${index}`;
            tocHTML += `<li class="${indent} flex items-center justify-between text-slate-700">
                <span>${text}</span>
                <span class="border-b border-dotted border-slate-300 flex-1 mx-2"></span>
                <span class="font-mono text-slate-400">Pg ?</span>
            </li>`;
        });

        tocHTML += `</ul></div><br />`;

        // Ensure focus and insert at end
        editorRef.current.focus();

        // Move cursor to end if needed (or just append if simpler, but execCommand is nice)
        const selection = window.getSelection();
        if (selection) {
            const range = document.createRange();
            range.selectNodeContents(editorRef.current);
            range.collapse(false); // Collapse to end
            selection.removeAllRanges();
            selection.addRange(range);
        }

        document.execCommand('insertHTML', false, tocHTML);
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
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-700 shadow-2xl rounded-full p-2 flex items-center gap-1 z-40 transition-all hover:scale-105">

                <button onClick={() => setShowCoverModal(true)} className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-slate-800 rounded-xl transition-colors group">
                    <LayoutTemplate className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Cover</span>
                </button>

                <div className="w-px h-8 bg-slate-700 mx-1"></div>

                <button onClick={insertTOC} className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-slate-800 rounded-xl transition-colors group">
                    <ListOrdered className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">TOC</span>
                </button>

                <div className="w-px h-8 bg-slate-700 mx-1"></div>

                <div className="relative group">
                    <button className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-slate-800 rounded-xl transition-colors">
                        <FileType className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Format</span>
                    </button>
                    {/* Format Dropdown (Hover) */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-32 bg-slate-800 rounded-xl shadow-xl overflow-hidden hidden group-hover:block border border-slate-700">
                         <button onClick={() => setFormatStyle('standard')} className={`w-full text-left px-4 py-2 text-xs font-bold ${formatStyle === 'standard' ? 'text-emerald-400 bg-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>Standard</button>
                         <button onClick={() => setFormatStyle('apa')} className={`w-full text-left px-4 py-2 text-xs font-bold ${formatStyle === 'apa' ? 'text-emerald-400 bg-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>APA Style</button>
                         <button onClick={() => setFormatStyle('mla')} className={`w-full text-left px-4 py-2 text-xs font-bold ${formatStyle === 'mla' ? 'text-emerald-400 bg-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>MLA Style</button>
                    </div>
                </div>

                <div className="w-px h-8 bg-slate-700 mx-1"></div>

                <button onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-slate-800 rounded-xl transition-colors group">
                    {isScanning ? (
                        <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                    ) : (
                        <ScanText className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    )}
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Scan</span>
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
