import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import {
  Zap, Upload, Printer, Download, Sparkles, FileText, ChevronLeft, MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';
import { mockBusinesses } from '../data/mockData';
import { GeminiHandler, LiteHandler, XHandler } from '../services/playbook/aiEngine';
import { extractTextFromPdf, generateDocx, generatePdf } from '../services/playbook/fileHandler';

// Playbook Context (Local State for now)
type PlaybookMode = 'lite' | 'pro' | 'x';

export const Playbook = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<PlaybookMode | null>(null);
  const [content, setContent] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showVendorMenu, setShowVendorMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter Stationary Vendors
  const stationaryVendors = mockBusinesses.filter(b => b.category === 'Stationary');

  // --- HANDLERS ---

  const handleModeSelect = (selectedMode: PlaybookMode) => {
    setMode(selectedMode);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
        if (file.type === 'application/pdf') {
            const text = await extractTextFromPdf(file);
            setContent(prev => prev + `\n\n[PDF Content]:\n${text}`);
        } else {
            // For images, we would use Vision API, for now basic placeholder or text
            // In Pro mode, we could upload image to Gemini.
            // For MVP, just acknowledging upload.
            setContent(prev => prev + `\n\n[Uploaded ${file.name} - Vision Analysis Pending]`);
        }
    } catch (error) {
        console.error("Upload Error:", error);
        alert("Failed to parse file.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleRunPrompt = async () => {
    if (!prompt) return;
    setIsProcessing(true);

    let response = "";
    try {
        if (mode === 'pro') {
            response = await GeminiHandler(`Content:\n${content}\n\nUser Request: ${prompt}`);
        } else if (mode === 'lite') {
            response = await LiteHandler(prompt);
        } else if (mode === 'x') {
            response = await XHandler(prompt);
        }

        if (mode === 'x') {
             // Chat mode appends differently
             setContent(prev => prev + `\n\nUser: ${prompt}\nPlaybook X: ${response}`);
        } else {
             // Document mode replaces or appends based on context
             // For simplicity in MVP, we append or replace if empty
             setContent(response || "No response generated.");
        }
    } catch (error) {
        console.error(error);
        alert("AI processing failed.");
    } finally {
        setPrompt('');
        setIsProcessing(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
      if (!content) return;

      const blob = format === 'pdf' ? generatePdf(content) : await generateDocx(content);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Playbook_Export.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setShowExportMenu(false);
  };

  const handleSendToPrint = async (vendorId: string) => {
      const vendor = stationaryVendors.find(v => v.id === vendorId);
      if (!vendor) return;

      // Generate a temporary file blob to pass
      // const blob = await generateDocx(content);
      // Create a File object to simulate upload (Unused in this version, relying on text)
      // const file = new File([blob], "Playbook_Document.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

      // Navigate to submit task
      // We can't pass File object in state efficiently if large, but for local it works.
      // Better to pass metadata or use a global context store.
      // For this MVP, we'll assume the user will manually attach or we rely on 'prefilledInstructions'.

      navigate('/submit-task', {
          state: {
              vendorId: vendor.id,
              vendorConfig: {},
              business: vendor,
              prefilledInstructions: `[Attached Playbook Document] Please print. Content length: ${content.length} chars.`
          }
      });
  };

  // --- SELECTION SCREEN ---
  if (!mode) {
    return (
      <div className="h-[calc(100vh-140px)] flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
           <div className="text-center space-y-2">
             <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
               <span className="text-emerald-500">Playbook</span> Workspace
             </h1>
             <p className="text-slate-500">Your AI-powered mini-stationary.</p>
           </div>

           <div className="grid gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={() => handleModeSelect('lite')}
                className="flex items-start gap-4 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500 transition-all text-left group"
              >
                 <div className="p-3 bg-slate-50 text-slate-600 rounded-xl group-hover:bg-slate-100">
                    <Zap className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-900 text-lg">Playbook Lite</h3>
                    <p className="text-slate-500 text-sm mt-1">Offline. Instant grammar checks & summaries.</p>
                 </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={() => handleModeSelect('pro')}
                className="flex items-start gap-4 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500 transition-all text-left group"
              >
                 <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-100">
                    <Sparkles className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-900 text-lg">Playbook Pro</h3>
                    <p className="text-slate-500 text-sm mt-1">Online. Deep formatting, Vision API, & Conversion.</p>
                 </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={() => handleModeSelect('x')}
                className="flex items-start gap-4 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-500 hover:ring-1 hover:ring-indigo-500 transition-all text-left group"
              >
                 <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100">
                    <MessageSquare className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-900 text-lg">Playbook X (Chat)</h3>
                    <p className="text-slate-500 text-sm mt-1">Fast conversational answers. No canvas.</p>
                 </div>
              </motion.button>
           </div>
        </div>
      </div>
    );
  }

  // --- WORKSPACE UI ---
  return (
    <div className="h-[calc(100vh-80px)] flex flex-col bg-slate-50 relative">

      {/* 1. Header / Toolbar */}
      <div className="h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setMode(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="font-bold text-slate-700 flex items-center gap-2">
                  Playbook <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">{mode}</span>
              </h2>
          </div>

          <div className="flex gap-2">
              {/* Export Dropdown */}
              <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setShowExportMenu(!showExportMenu)}>
                      <Download className="w-4 h-4 mr-2" /> Export
                  </Button>
                  {showExportMenu && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-2 flex flex-col gap-1 z-50">
                          <button onClick={() => handleExport('pdf')} className="text-left px-4 py-2 hover:bg-slate-50 rounded-lg text-sm font-medium text-slate-700">As PDF Document</button>
                          <button onClick={() => handleExport('docx')} className="text-left px-4 py-2 hover:bg-slate-50 rounded-lg text-sm font-medium text-slate-700">As Word (.docx)</button>
                      </div>
                  )}
              </div>

              {/* Send to Print */}
              <div className="relative">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setShowVendorMenu(!showVendorMenu)}>
                      <Printer className="w-4 h-4 mr-2" /> Print
                  </Button>
                  {showVendorMenu && (
                      <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50">
                          <p className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Select Vendor</p>
                          {stationaryVendors.map(v => (
                              <button
                                key={v.id}
                                onClick={() => handleSendToPrint(v.id)}
                                className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg text-sm font-medium text-slate-700 flex items-center gap-2"
                              >
                                  <Printer className="w-3 h-3 text-indigo-400" /> {v.name}
                              </button>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* 2. Canvas (Document Preview) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-3xl bg-white min-h-[800px] shadow-lg border border-slate-100 rounded-sm p-8 md:p-12 relative"
          >
              {content ? (
                  <div className="prose prose-slate max-w-none whitespace-pre-wrap font-serif text-lg leading-relaxed text-slate-800">
                      {content}
                  </div>
              ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 pointer-events-none">
                      <FileText className="w-16 h-16 mb-4 opacity-20" />
                      <p className="text-xl font-medium">Untitled Document</p>
                      <p className="text-sm">Type a command or upload a file to begin.</p>
                  </div>
              )}

              {isProcessing && (
                  <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-20">
                      <div className="flex flex-col items-center gap-3">
                          <Sparkles className="w-8 h-8 text-emerald-500 animate-spin" />
                          <p className="text-sm font-bold text-emerald-600 animate-pulse">Playbook is thinking...</p>
                      </div>
                  </div>
              )}
          </motion.div>
      </div>

      {/* 3. Command Bar (Floating) */}
      <div className="h-24 bg-white border-t border-slate-200 px-4 md:px-0 flex items-center justify-center z-20">
          <div className="w-full max-w-3xl flex gap-2 relative">

              {/* Upload Button */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.png,.jpg"
              />
              <Button
                variant="outline"
                className="h-12 w-12 rounded-xl border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50"
                onClick={() => fileInputRef.current?.click()}
              >
                  <Upload className="w-5 h-5" />
              </Button>

              {/* Command Input */}
              <div className="flex-1 relative">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRunPrompt()}
                    placeholder={mode === 'x' ? "Ask X anything..." : mode === 'pro' ? "Ask Pro to format, summarize, or convert..." : "Ask Lite to fix grammar..."}
                    className="w-full h-12 pl-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-all shadow-inner"
                  />
                  <div className="absolute right-2 top-2">
                      <Button
                        size="sm"
                        className={`h-8 w-8 p-0 rounded-lg ${prompt ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}
                        onClick={handleRunPrompt}
                        disabled={!prompt}
                      >
                          <Zap className="w-4 h-4 fill-current" />
                      </Button>
                  </div>
              </div>
          </div>
      </div>

    </div>
  );
};
