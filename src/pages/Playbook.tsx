import { useState, useRef, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { FloatingToolbar } from '../components/playbook/FloatingToolbar';
import { CoverPageModal, type CoverPageData } from '../components/playbook/CoverPageModal';
import { LiteMode } from '../components/playbook/LiteMode';
import {
    Download, Printer, FileText, Layout, List, Scan,
    ChevronLeft, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

export const Playbook = () => {
    const navigate = useNavigate();
    const editorRef = useRef<HTMLDivElement>(null);
    const [showCoverModal, setShowCoverModal] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    // Auto-Focus editor on load
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.focus();
        }
    }, []);

    // --- FEATURES ---

    // 1. Smart Cover Page
    const handleAddCover = (data: CoverPageData) => {
        setShowCoverModal(false);
        const coverHtml = `
            <div class="cover-page" style="text-align: center; padding: 4rem 0; page-break-after: always; border-bottom: 2px dashed #e2e8f0; margin-bottom: 2rem;">
                <h1 style="font-size: 24pt; font-weight: bold; margin-bottom: 2rem; text-transform: uppercase;">${data.university}</h1>
                <div style="margin: 4rem 0;">
                    <h2 style="font-size: 18pt; font-weight: bold; margin-bottom: 1rem;">${data.title}</h2>
                    <p style="font-size: 14pt;">By</p>
                    <h3 style="font-size: 16pt; font-weight: bold;">${data.studentName}</h3>
                    <p style="font-size: 12pt;">Reg No: ${data.regNo}</p>
                </div>
                <div style="margin-top: 4rem;">
                    <p style="font-size: 12pt;">A Research Paper Submitted to the</p>
                    <p style="font-size: 12pt; font-weight: bold;">${data.course}</p>
                    <p style="font-size: 12pt; margin-top: 2rem;">${new Date().toLocaleDateString()}</p>
                </div>
            </div>
            <br/>
        `;

        if (editorRef.current) {
            // Prepend cover page
            editorRef.current.innerHTML = coverHtml + editorRef.current.innerHTML;
        }
    };

    // 2. Auto TOC
    const generateTOC = () => {
        if (!editorRef.current) return;

        const headings = editorRef.current.querySelectorAll('h1, h2');
        if (headings.length === 0) {
            alert("No headings found! Use H1 or H2 to create sections.");
            return;
        }

        let tocHtml = `<div class="toc-section" style="background: #f8fafc; padding: 2rem; border-radius: 1rem; margin-bottom: 2rem;">
            <h2 style="margin-bottom: 1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">Table of Contents</h2>
            <ul style="list-style: none; padding: 0;">`;

        headings.forEach((h, index) => {
            const id = `heading-${index}`;
            h.id = id;
            const level = h.tagName === 'H1' ? '0' : '1.5rem';
            tocHtml += `<li style="margin-bottom: 0.5rem; padding-left: ${level}; display: flex; justify-content: space-between;">
                <a href="#${id}" style="text-decoration: none; color: #0f172a; font-weight: 500;">${h.textContent}</a>
                <span style="color: #94a3b8; border-bottom: 1px dotted #cbd5e1; flex: 1; margin: 0 0.5rem;"></span>
                <span>${index + 1}</span>
            </li>`;
        });

        tocHtml += `</ul></div><br/>`;

        // Insert after cover page if exists, or at top
        const coverPage = editorRef.current.querySelector('.cover-page');
        if (coverPage) {
            coverPage.insertAdjacentHTML('afterend', tocHtml);
        } else {
            editorRef.current.innerHTML = tocHtml + editorRef.current.innerHTML;
        }
    };

    // 3. One-Click Formatting (APA/MLA)
    const applyFormatting = (style: 'APA' | 'MLA') => {
        if (!editorRef.current) return;

        editorRef.current.style.fontFamily = "'Times New Roman', serif";
        editorRef.current.style.fontSize = "12pt";
        editorRef.current.style.lineHeight = "2.0";
        editorRef.current.style.color = "#000000";

        // Indent paragraphs
        const paragraphs = editorRef.current.querySelectorAll('p');
        paragraphs.forEach(p => {
            p.style.textIndent = "0.5in";
            p.style.marginBottom = "0";
        });

        alert(`Applied ${style} Formatting: Times New Roman, 12pt, Double Spaced.`);
    };

    // 4. Offline OCR
    const handleOCR = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (!file) return;

            setIsScanning(true);
            try {
                const { data: { text } } = await Tesseract.recognize(file, 'eng');
                document.execCommand('insertText', false, text);
            } catch (err) {
                alert("OCR Failed: " + err);
            } finally {
                setIsScanning(false);
            }
        };
        input.click();
    };

    // 5. Universal Conversion (Export)
    const handleExport = (type: 'pdf' | 'docx') => {
        if (type === 'pdf') {
             // Simple PDF export using window.print() style or jsPDF
             // For better A4 simulation, we can use jsPDF HTML
             const doc = new jsPDF('p', 'pt', 'a4');
             if (editorRef.current) {
                 doc.html(editorRef.current, {
                     callback: function (doc) {
                         doc.save("Playbook_Document.pdf");
                     },
                     x: 40,
                     y: 40,
                     width: 500, // A4 width minus margins
                     windowWidth: 800
                 });
             }
        } else {
            // DOCX Export using 'docx' library
            // This is a complex mapping, we'll do a simple text dump for this MVP step
            // or a basic paragraph mapping.
            if (!editorRef.current) return;

            const paragraphs = Array.from(editorRef.current.childNodes).map(node => {
                if (node.nodeName === 'P' || node.nodeName === '#text') {
                     return new Paragraph({
                         children: [new TextRun(node.textContent || "")],
                         spacing: { line: 360 } // 1.5 spacing
                     });
                }
                if (node.nodeName.startsWith('H')) {
                     return new Paragraph({
                         text: node.textContent || "",
                         heading: HeadingLevel.HEADING_1
                     });
                }
                return new Paragraph("");
            });

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: paragraphs
                }]
            });

            Packer.toBlob(doc).then(blob => {
                saveAs(blob, "Playbook_Document.docx");
            });
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans">

            {/* Top Navigation */}
            <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 fixed top-0 w-full z-40 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
                        <ChevronLeft className="w-5 h-5 text-slate-500" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="font-bold text-slate-900 text-sm leading-tight">Untitled Document</h1>
                            <p className="text-[10px] text-slate-500 font-medium">Last saved just now</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleExport('docx')}>
                        <Download className="w-4 h-4 mr-2" /> .docx
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                        <Printer className="w-4 h-4 mr-2" /> PDF
                    </Button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 mt-16 flex overflow-hidden">

                {/* Left Sidebar (Tools) */}
                <div className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col p-4 gap-2 z-30">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Insert</p>

                    <Button variant="ghost" className="justify-start" onClick={() => setShowCoverModal(true)}>
                        <Layout className="w-4 h-4 mr-2 text-emerald-600" /> Cover Page
                    </Button>
                    <Button variant="ghost" className="justify-start" onClick={generateTOC}>
                        <List className="w-4 h-4 mr-2 text-indigo-600" /> Table of Contents
                    </Button>
                    <Button variant="ghost" className="justify-start" onClick={handleOCR}>
                        {isScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Scan className="w-4 h-4 mr-2 text-blue-600" />}
                        Scan Notes (OCR)
                    </Button>

                    <div className="h-px bg-slate-100 my-2"></div>

                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Format</p>
                    <Button variant="ghost" className="justify-start" onClick={() => applyFormatting('APA')}>
                        <span className="font-serif font-bold text-slate-900 mr-2">A</span> APA Style
                    </Button>
                    <Button variant="ghost" className="justify-start" onClick={() => applyFormatting('MLA')}>
                        <span className="font-serif font-bold text-slate-900 mr-2">M</span> MLA Style
                    </Button>

                    {/* LITE Mode Banner in Sidebar */}
                    <div className="mt-auto">
                        <LiteMode editorRef={editorRef} />
                    </div>
                </div>

                {/* Center Canvas */}
                <div className="flex-1 bg-slate-100 overflow-y-auto p-8 flex justify-center relative" id="canvas-container">

                    {/* The A4 Page */}
                    <div
                        ref={editorRef}
                        contentEditable
                        className="bg-white shadow-xl min-h-[1123px] w-[794px] p-[96px] outline-none text-slate-900 leading-relaxed cursor-text selection:bg-emerald-100 selection:text-emerald-900"
                        style={{
                            maxWidth: '100%',
                            fontFamily: 'Times New Roman',
                            fontSize: '12pt'
                        }}
                    >
                        <h1 className="text-3xl font-bold mb-4">Introduction</h1>
                        <p>Start typing your document here...</p>
                    </div>

                    {/* Floating Toolbar */}
                    <FloatingToolbar editorRef={editorRef} />

                </div>

            </div>

            {/* Modals */}
            <CoverPageModal
                isOpen={showCoverModal}
                onClose={() => setShowCoverModal(false)}
                onApply={handleAddCover}
            />

        </div>
    );
};
