import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Send, FileText, Scan, Sparkles, Loader2, GraduationCap, Upload, X, File, Download, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ErnestMessage } from '../../types';
import { cn } from '../../lib/utils';
import { performOCR, generatePDF } from '../../utils/ai-helpers';

export const ErnestPro = () => {
  const [messages, setMessages] = useState<ErnestMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Ready to study? I'm your AI partner. Upload a handout to scan, or ask me anything.",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  // Initialize Worker
  useEffect(() => {
    if (!workerRef.current) {
        // Vite worker import
        workerRef.current = new Worker(new URL('../../workers/ai.worker.ts', import.meta.url), { type: 'module' });

        workerRef.current.onmessage = (e) => {
            const { status, message, result, progress } = e.data;

            if (status === 'loading') {
                setLoadingStatus(message);
                if (progress) setLoadingProgress(progress);
            } else if (status === 'ready') {
                setLoadingStatus(null);
                setLoadingProgress(0);
            } else if (status === 'complete') {
                setIsProcessing(false);
                addMessage('assistant', result);
            } else if (status === 'error') {
                setIsProcessing(false);
                addMessage('assistant', `Error: ${message}`);
            }
        };

        // Trigger Init
        workerRef.current.postMessage({ type: 'init' });
    }

    return () => {
        // workerRef.current?.terminate(); // Keep alive for caching
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing, loadingStatus]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role,
        content,
        timestamp: new Date()
    }]);
  };

  const handleSend = async (textOverride?: string, task: 'chat' | 'fix' | 'summarize' = 'chat') => {
    const text = textOverride || input;
    if (!text.trim() && !uploadedFile) return;

    // Handle File Upload (OCR) logic first if present
    let processedText = text;

    if (uploadedFile) {
       addMessage('user', `[Uploaded: ${uploadedFile.name}] ${text}`);
       setInput('');
       setUploadedFile(null);
       setIsProcessing(true);

       // If image, scan it
       if (uploadedFile.type.startsWith('image/')) {
           setLoadingStatus("Scanning document (OCR)...");
           try {
               const ocrText = await performOCR(uploadedFile, (p) => setLoadingProgress(p));
               setLoadingStatus("Analyzing scanned text...");

               // Send to worker
               workerRef.current?.postMessage({
                   type: task === 'chat' ? 'summarize' : task, // Default to summarize for scans
                   payload: `Context: ${ocrText}\n\nTask: ${text || "Summarize this."}`
               });
           } catch (err) {
               setIsProcessing(false);
               addMessage('assistant', "Failed to scan image. Please try a clearer photo.");
           }
       } else {
           // Standard text file or PDF (skip parsing for MVP, just mock or raw)
           setIsProcessing(false);
           addMessage('assistant', "I can currently only read text from Images (OCR). Please upload an image/screenshot.");
       }
       return;
    }

    // Standard Text Chat
    addMessage('user', text);
    setInput('');
    setIsProcessing(true);

    workerRef.current?.postMessage({ type: task, payload: text });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleExportPDF = () => {
      // Export last assistant message or all? Let's do last relevant note.
      const lastResponse = [...messages].reverse().find(m => m.role === 'assistant');
      if (lastResponse) {
          generatePDF(lastResponse.content);
      } else {
          alert("No content to export!");
      }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 relative">

      {/* Loading Overlay */}
      {loadingStatus && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
              <p className="text-slate-900 font-semibold mb-2">{loadingStatus}</p>
              <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${loadingProgress}%` }} />
              </div>
          </div>
      )}

      {/* Tools Header */}
      <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center gap-2">
         <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
               <Camera className="w-4 h-4" />
               Scan Handout
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
            />
         </div>

         <div className="flex gap-1">
             <Button variant="ghost" size="icon" title="Summarize" onClick={() => handleSend("Summarize this", 'summarize')}>
                <FileText className="w-4 h-4 text-slate-500 hover:text-emerald-600" />
             </Button>
             <Button variant="ghost" size="icon" title="Grammar Fix" onClick={() => handleSend("Fix grammar", 'fix')}>
                <Sparkles className="w-4 h-4 text-slate-500 hover:text-emerald-600" />
             </Button>
             <Button variant="ghost" size="icon" title="Export PDF" onClick={handleExportPDF}>
                <Download className="w-4 h-4 text-slate-500 hover:text-emerald-600" />
             </Button>
         </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "flex w-full",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] p-4 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed whitespace-pre-wrap",
                  msg.role === 'user'
                    ? "bg-emerald-600 text-white rounded-br-none"
                    : "bg-white text-slate-800 rounded-bl-none border border-slate-100"
                )}
              >
                <p>{msg.content}</p>
                <span className="text-[10px] opacity-50 mt-2 block text-right">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isProcessing && !loadingStatus && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start w-full">
             <div className="bg-white p-4 rounded-2xl rounded-bl-none flex items-center gap-2 border border-slate-100">
               <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
               <span className="text-xs text-slate-500">Thinking...</span>
             </div>
           </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 relative z-10">

        {uploadedFile && (
           <motion.div
             initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
             className="absolute bottom-full left-4 mb-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 border border-emerald-100 shadow-sm"
           >
              <File className="w-3 h-3" />
              {uploadedFile.name}
              <button onClick={() => setUploadedFile(null)} className="hover:text-red-500 ml-1"><X className="w-3 h-3" /></button>
           </motion.div>
        )}

        <div className="flex gap-2 items-end">
           <div className="flex-1 relative">
             <textarea
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => {
                   if (e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault();
                       handleSend();
                   }
               }}
               placeholder="Ask anything (English or Swahili)..."
               className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all resize-none min-h-[50px] max-h-[120px]"
               rows={1}
             />
           </div>

           <Button
             onClick={() => handleSend()}
             disabled={(!input.trim() && !uploadedFile) || isProcessing}
             className={cn("rounded-full h-12 w-12 shrink-0 transition-all", (input.trim() || uploadedFile) ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-200")}
           >
             <Send className="w-5 h-5 text-white" />
           </Button>
        </div>
      </div>
    </div>
  );
};
