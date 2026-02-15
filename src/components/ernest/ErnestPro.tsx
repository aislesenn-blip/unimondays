import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Send, FileText, Scan, Sparkles, Loader2, GraduationCap, Upload, X, File } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ErnestMessage } from '../../types';
import { cn } from '../../lib/utils';

export const ErnestPro = () => {
  const [messages, setMessages] = useState<ErnestMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Ready to study? I'm in Pro Mode. Upload a document or ask me anything in English or Swahili.",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || input;
    if (!text.trim() && !uploadedFile) return;

    const content = uploadedFile
      ? `[Attached: ${uploadedFile}] ${text}`
      : text;

    const userMsg: ErnestMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setUploadedFile(null); // Clear file after send
    setIsProcessing(true);

    // Bilingual & Persona Logic
    const lowerInput = text.toLowerCase();
    const isSwahili = lowerInput.includes('mambo') || lowerInput.includes('habari') || lowerInput.includes('nondo') || lowerInput.includes('vipi') || lowerInput.includes('swali') || lowerInput.includes('asante');

    setTimeout(() => {
      let responseContent = "";
      let actionType: any = undefined;

      if (lowerInput.includes('quiz')) {
         responseContent = isSwahili
            ? "Sawa, twende kazi. Swali la haraka: Nini maana ya 'Opportunity Cost' katika uchumi?"
            : "Let's do this. Quick question: What defines 'Opportunity Cost' in economics?";
      } else if (lowerInput.includes('scan') || lowerInput.includes('pdf') || content.includes('[Attached:')) {
         responseContent = isSwahili
            ? "Nimeupata mwongozo. Ninaichakata hiyo document sasa hivi. Subiri kidogo..."
            : "Document received. I'm analyzing the content now...";
         actionType = 'ocr_scan';
      } else if (lowerInput.includes('grammar') || lowerInput.includes('fix')) {
         responseContent = isSwahili
            ? "Nimepitia kazi yako. Hapa kuna marekebisho machache ya sarufi."
            : "I've polished the grammar. Here is the revised version.";
         actionType = 'rewrite_text';
      } else if (lowerInput.includes('summary') || lowerInput.includes('fupisha')) {
         responseContent = isSwahili
            ? "Haya hapa mambo makuu (Nondo) kutoka kwenye hiyo text:"
            : "Here are the key bullet points from the text:";
         actionType = 'summarize';
      } else {
         // General Chit Chat
         if (isSwahili) {
             const responses = [
                 "Nipo hapa kwa ajili yako. Tuendelee kusoma?",
                 "Umeelewa concept? Au nirejee tena?",
                 "Hiyo ni nondo! Una swali lingine?",
                 "Karibu sana. Nini kingine nikusaidie?"
             ];
             responseContent = responses[Math.floor(Math.random() * responses.length)];
         } else {
             const responses = [
                 "I'm here. Ready to tackle the next topic?",
                 "Did that concept make sense?",
                 "Great point. Anything else you need help with?",
                 "Anytime. What's next on the agenda?"
             ];
             responseContent = responses[Math.floor(Math.random() * responses.length)];
         }
      }

      const responseMsg: ErnestMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        action: actionType ? {
          type: actionType,
          status: 'completed',
          result: actionType === 'ocr_scan' ? "Extracted Text / Analysis Result..." : "Processed Output..."
        } : undefined
      };
      setMessages(prev => [...prev, responseMsg]);
      setIsProcessing(false);
    }, 1500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file.name);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] max-w-2xl mx-auto w-full bg-white dark:bg-slate-900/50 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">

      {/* Upload & Tools Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur flex justify-between items-center gap-4">
         <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={triggerFileUpload} className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
               <Upload className="w-4 h-4" />
               Upload PDF/Img
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.jpg,.png,.jpeg,.docx"
              onChange={handleFileUpload}
            />
         </div>

         <div className="flex gap-1">
             <Button variant="ghost" size="icon" title="Scan" onClick={() => handleSend("Scan this document")}>
                <Scan className="w-4 h-4 text-slate-500" />
             </Button>
             <Button variant="ghost" size="icon" title="Summarize" onClick={() => handleSend("Summarize this")}>
                <FileText className="w-4 h-4 text-slate-500" />
             </Button>
         </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
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
                  "max-w-[85%] p-4 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed",
                  msg.role === 'user'
                    ? "bg-indigo-600 text-white rounded-br-none"
                    : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700"
                )}
              >
                <p>{msg.content}</p>

                {msg.action && msg.action.status === 'completed' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 p-3 bg-slate-50 dark:bg-black/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 text-xs font-mono"
                  >
                     <div className="flex items-center gap-2 mb-1 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider text-[10px]">
                       <Sparkles className="w-3 h-3" /> Result
                     </div>
                     <div className="opacity-80">{msg.action.result}</div>
                  </motion.div>
                )}

                <span className="text-[10px] opacity-50 mt-2 block text-right">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isProcessing && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="flex justify-start w-full"
           >
             <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-bl-none flex items-center gap-2 border border-slate-100 dark:border-slate-700">
               <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
               <span className="text-xs text-slate-500">Thinking...</span>
             </div>
           </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 relative z-10">

        {uploadedFile && (
           <motion.div
             initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
             className="absolute bottom-full left-4 mb-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 border border-indigo-100 dark:border-indigo-800 shadow-sm"
           >
              <File className="w-3 h-3" />
              {uploadedFile}
              <button onClick={() => setUploadedFile(null)} className="hover:text-red-500 ml-1"><X className="w-3 h-3" /></button>
           </motion.div>
        )}

        <div className="flex gap-2 items-end">
           <Button
             variant="outline"
             size="icon"
             className="rounded-full shrink-0 border-indigo-200 hover:bg-indigo-50 text-indigo-600"
             title="Quiz Me"
             onClick={() => handleSend("Quiz me on this topic")}
           >
             <GraduationCap className="w-5 h-5" />
           </Button>

           <div className="flex-1 relative">
             <input
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSend()}
               placeholder="Ask anything (English or Swahili)..."
               className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-full px-5 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
             />
           </div>

           <Button
             onClick={() => handleSend()}
             disabled={(!input.trim() && !uploadedFile) || isProcessing}
             className={cn("rounded-full h-12 w-12 shrink-0 transition-all", (input.trim() || uploadedFile) ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-300 dark:bg-slate-700")}
           >
             <Send className="w-5 h-5 text-white" />
           </Button>
        </div>
      </div>
    </div>
  );
};
