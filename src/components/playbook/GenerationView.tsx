import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Download, Printer, CheckCircle, Loader2, FileText, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GenerationViewProps {
  text: string;
  metadata: any;
  onBack: () => void;
}

export const GenerationView = ({ text, metadata, onBack }: GenerationViewProps) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing...');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Start Worker
    workerRef.current = new Worker(new URL('../../workers/documentFactory.worker.ts', import.meta.url), { type: 'module' });

    // Simulate Progress Steps
    const steps = [
        { msg: "Analyzing Content...", time: 500 },
        { msg: "Formatting Margins...", time: 1000 },
        { msg: "Generating Cover Page...", time: 1500 },
        { msg: "Compiling PDF...", time: 2000 }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
        if (currentStep < steps.length) {
            setStatus(steps[currentStep].msg);
            setProgress((currentStep + 1) * 20);
            currentStep++;
        }
    }, 500);

    // Send Data to Worker
    workerRef.current.postMessage({
        type: 'generate',
        content: text,
        metadata,
        options: {
            style: metadata.style,
            coverPage: metadata.coverPage,
            pageNumbers: metadata.pageNumbers
        }
    });

    workerRef.current.onmessage = (e) => {
        const { status, blob, message } = e.data;
        if (status === 'success') {
            clearInterval(interval);
            setProgress(100);
            setStatus("Document Ready");
            setPdfBlob(blob);
        } else {
            clearInterval(interval);
            setStatus("Error: " + message);
        }
    };

    return () => {
        workerRef.current?.terminate();
        clearInterval(interval);
    };
  }, [text, metadata]);

  const handleDownload = () => {
      if (!pdfBlob) return;
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${metadata.title.replace(/\s+/g, '_')}_Final.pdf`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
      if (!pdfBlob) return;
      // In a real app, we'd pass the blob to a context or upload it.
      // For MVP, just navigate to print page.
      navigate('/print', { state: { fromPlaybook: true } });
  };

  return (
    <div className="space-y-6 animate-in zoom-in duration-500">

      {/* Progress Card */}
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center relative overflow-hidden">
         {progress < 100 && (
             <div className="absolute top-0 left-0 h-2 bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
         )}

         <div className="mb-6 flex justify-center">
             {progress < 100 ? (
                 <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center animate-pulse">
                     <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                 </div>
             ) : (
                 <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center animate-bounce">
                     <CheckCircle className="w-10 h-10 text-emerald-600" />
                 </div>
             )}
         </div>

         <h2 className="text-2xl font-black text-slate-900 mb-2">{status}</h2>
         <p className="text-slate-500 text-sm mb-6">{progress < 100 ? "Please wait while we build your document." : "Your document is ready for download."}</p>

         {progress === 100 && (
             <div className="grid gap-4 max-w-sm mx-auto">
                 <Button onClick={handleDownload} className="h-14 bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200 text-lg font-bold">
                     <Download className="w-5 h-5 mr-2" /> Download PDF
                 </Button>

                 <Button onClick={handlePrint} className="h-14 bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200 text-lg font-bold">
                     <Printer className="w-5 h-5 mr-2" /> Send to UniMonday Print
                 </Button>

                 <Button variant="ghost" onClick={onBack} className="text-slate-400 hover:text-slate-600">
                     Start Over
                 </Button>
             </div>
         )}
      </div>

      {/* Preview Info (Static) */}
      {progress === 100 && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-4 opacity-70">
              <div className="p-3 bg-white rounded-lg border border-slate-100">
                  <FileText className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                  <h4 className="font-bold text-slate-700 text-sm">{metadata.title}.pdf</h4>
                  <p className="text-xs text-slate-400">{metadata.style === 'standard' ? 'Times New Roman' : 'Arial'} • A4 • Ready</p>
              </div>
          </div>
      )}

    </div>
  );
};
