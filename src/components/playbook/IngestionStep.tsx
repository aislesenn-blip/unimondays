import { useState, useRef } from 'react';
import { Button } from '../ui/Button';
import { Upload, FileText, Loader2, RefreshCw } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface IngestionStepProps {
  onData: (text: string) => void;
  onNext: () => void;
}

export const IngestionStep = ({ onData, onNext }: IngestionStepProps) => {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    try {
      let extractedText = "";

      if (file.type === 'application/pdf') {
         const arrayBuffer = await file.arrayBuffer();
         const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
         for (let i = 1; i <= pdf.numPages; i++) {
             const page = await pdf.getPage(i);
             const content = await page.getTextContent();
             extractedText += content.items.map((item: any) => item.str).join(" ") + "\n\n";
         }
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
         const arrayBuffer = await file.arrayBuffer();
         const result = await mammoth.extractRawText({ arrayBuffer });
         extractedText = result.value;
      } else {
         // Assuming image logic handled elsewhere or simple text
         alert("Format not fully supported for raw extraction yet.");
         return;
      }

      setText(prev => prev + "\n" + extractedText);
    } catch (error) {
      console.error(error);
      alert("Failed to read file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleContinue = () => {
    if (!text.trim()) {
      alert("Please enter some text or upload a file.");
      return;
    }
    onData(text);
    onNext();
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-500">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-500" />
          Ingest Content
        </h2>

        <div className="relative">
          <textarea
            value={text}
            onChange={handleTextChange}
            placeholder="Paste your assignment here..."
            className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none font-mono text-sm leading-relaxed"
          />
          {isProcessing && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
               <div className="flex flex-col items-center gap-2">
                 <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                 <span className="text-sm font-bold text-emerald-700">Reading Document...</span>
               </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-between items-center">
           <input
             type="file"
             ref={fileInputRef}
             className="hidden"
             accept=".pdf,.docx,.txt"
             onChange={handleFileChange}
           />
           <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
             <Upload className="w-4 h-4 mr-2" /> Upload File
           </Button>

           <Button variant="ghost" onClick={() => setText('')} disabled={!text}>
             <RefreshCw className="w-4 h-4 mr-2" /> Clear
           </Button>
        </div>
      </div>

      <Button onClick={handleContinue} className="w-full h-14 text-lg font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200">
        Next: Configure Document
      </Button>
    </div>
  );
};
