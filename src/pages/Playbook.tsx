import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Editor } from '../components/playbook/Editor';
import { ChevronLeft, Download, FileText } from 'lucide-react';
import { generateDocx, generatePdf } from '../services/playbook/fileHandler';

export const Playbook = () => {
    const navigate = useNavigate();
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (format: 'pdf' | 'docx') => {
        setIsExporting(true);
        try {
            // Get content from the editor div
            // We use a specific selector to target the contentEditable div inside Editor
            const editorDiv = document.querySelector('[contenteditable="true"]');
            const content = editorDiv?.innerHTML || '';

            if (!content) {
                alert("Document is empty.");
                return;
            }

            let blob: Blob;
            if (format === 'pdf') {
                blob = await generatePdf(content);
            } else {
                blob = await generateDocx(content);
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Playbook_Document.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Export Error:", e);
            alert("Export failed. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
                 <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/home')} className="-ml-2 text-slate-500 hover:text-slate-900">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-slate-900 text-lg flex items-center gap-2 leading-none">
                            Playbook <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase rounded tracking-widest">PRO</span>
                        </h1>
                        <p className="text-[10px] text-slate-400 font-medium">Untitled Document</p>
                    </div>
                 </div>

                 <div className="flex gap-2">
                     <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('docx')}
                        disabled={isExporting}
                        className="hidden md:flex"
                     >
                        <FileText className="w-4 h-4 mr-2 text-blue-600" /> Word
                     </Button>
                     <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleExport('pdf')}
                        disabled={isExporting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 shadow-md font-bold"
                     >
                        <Download className="w-4 h-4 mr-2" />
                        {isExporting ? 'Exporting...' : 'Export PDF'}
                     </Button>
                 </div>
            </div>

            {/* Editor Workspace */}
            <div className="flex-1 overflow-y-auto bg-slate-100/50 pt-8 pb-32 scroll-smooth">
                 <Editor />
            </div>
        </div>
    );
};
