import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Send, FileText, Scan, Sparkles, Loader2, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ErnestMessage } from '../../types';
import { cn } from '../../lib/utils';

export const ErnestChat = () => {
  const [messages, setMessages] = useState<ErnestMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello, I'm Ernest. I can help you format documents, scan notes, or rewrite assignments. Upload a file or ask me anything.",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ErnestMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    // Simulate AI response
    setTimeout(() => {
      let responseContent = "I'm processing that for you.";
      let actionType: any = undefined;

      if (userMsg.content.toLowerCase().includes('format')) {
        responseContent = "I've formatted the document according to APA style guidelines.";
        actionType = 'format_doc';
      } else if (userMsg.content.toLowerCase().includes('scan')) {
        responseContent = "Scanning complete. Here is the text extracted from the image.";
        actionType = 'ocr_scan';
      } else if (userMsg.content.toLowerCase().includes('rewrite')) {
         responseContent = "Here is a more academic version of your introduction.";
         actionType = 'rewrite_text';
      } else {
        responseContent = "I can help with that. Would you like me to summarize the key points?";
        actionType = 'summarize';
      }

      const responseMsg: ErnestMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        action: actionType ? {
          type: actionType,
          status: 'completed',
          result: actionType === 'rewrite_text' ? "The impact of socio-economic factors on urban development is multifaceted..." : "Document processed successfully."
        } : undefined
      };
      setMessages(prev => [...prev, responseMsg]);
      setIsProcessing(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] max-w-2xl mx-auto w-full bg-white dark:bg-slate-900/50 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">

      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur flex items-center gap-3 sticky top-0 z-10">
        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
           <Bot className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
           <h2 className="font-bold text-slate-800 dark:text-slate-100">Ernest AI</h2>
           <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
             <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
             Online • Transformer v4.0
           </p>
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
                  "max-w-[80%] p-4 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed",
                  msg.role === 'user'
                    ? "bg-indigo-600 text-white rounded-br-none"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700"
                )}
              >
                <p>{msg.content}</p>

                {msg.action && msg.action.status === 'completed' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 p-3 bg-white/50 dark:bg-black/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 text-xs font-mono"
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
             <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl rounded-bl-none flex items-center gap-2">
               <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
               <span className="text-xs text-slate-500">Ernest is thinking...</span>
             </div>
           </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <div className="flex gap-2 items-end">
           <Button variant="outline" size="icon" className="rounded-full shrink-0" title="Upload Document">
             <FileText className="w-5 h-5 text-slate-500" />
           </Button>
           <Button variant="outline" size="icon" className="rounded-full shrink-0" title="Scan Image">
             <Scan className="w-5 h-5 text-slate-500" />
           </Button>

           <div className="flex-1 relative">
             <input
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSend()}
               placeholder="Ask Ernest to format, summarize, or scan..."
               className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-full px-5 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
             />
           </div>

           <Button
             onClick={handleSend}
             disabled={!input.trim() || isProcessing}
             className={cn("rounded-full h-12 w-12 shrink-0 transition-all", input.trim() ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-300 dark:bg-slate-700")}
           >
             <Send className="w-5 h-5 text-white" />
           </Button>
        </div>
      </div>
    </div>
  );
};
