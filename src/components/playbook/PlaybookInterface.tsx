import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Brain, Download, Loader2, Send, Paperclip, Sparkles, Zap, FileText } from 'lucide-react';
import SLMWorker from '../../workers/slmWorker?worker';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const PlaybookInterface = () => {
    const [isEngineReady, setIsEngineReady] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadStatus, setDownloadStatus] = useState('');
    const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [ingestedFiles, setIngestedFiles] = useState<string[]>([]);
    const [isIngesting, setIsIngesting] = useState(false);

    const workerRef = useRef<Worker | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Init Worker
        workerRef.current = new SLMWorker();

        workerRef.current.onmessage = (e) => {
            const { status, progress, message, text } = e.data;

            if (status === 'progress') {
                if (progress && progress <= 1) setDownloadProgress(Math.round(progress * 100));
                else if (progress) setDownloadProgress(Math.round(progress));

                setDownloadStatus(message || 'Downloading...');
            } else if (status === 'ready') {
                setIsEngineReady(true);
            } else if (status === 'response') {
                setIsThinking(false);
                setMessages(prev => [...prev, { role: 'ai', text: text.replace("Playbook:", "").trim() }]);
            } else if (status === 'ingested') {
                setIsIngesting(false);
                // We don't get the filename back easily unless we pass id, but simple push
                // Just toggle off loading.
            } else if (status === 'error') {
                setIsThinking(false);
                setIsIngesting(false);
                alert("Error: " + message);
            }
        };

        return () => workerRef.current?.terminate();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleDownloadEngine = () => {
        setDownloadStatus("Initiating secure download...");
        workerRef.current?.postMessage({ type: 'load' });
    };

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setIsThinking(true);

        workerRef.current?.postMessage({
            type: 'generate',
            payload: { prompt: userMsg }
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsIngesting(true);
        const file = files[0]; // Process one for now or loop
        setIngestedFiles(prev => [...prev, file.name]);

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
            } else if (file.type === 'text/plain') {
                extractedText = await file.text();
            } else {
                alert("Unsupported file type. Please use PDF, DOCX, or TXT.");
                setIsIngesting(false);
                return;
            }

            // Send to worker for indexing
            workerRef.current?.postMessage({
                type: 'ingest',
                payload: { text: extractedText, filename: file.name }
            });

            // Initial message
            setMessages(prev => [...prev, {
                role: 'ai',
                text: `I've read "${file.name}". You can now ask me specific questions about it, or general questions.`
            }]);

        } catch (err) {
            console.error(err);
            alert("Failed to read file.");
            setIsIngesting(false);
        } finally {
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (!isEngineReady) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] p-6 text-center max-w-md mx-auto animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-slate-200">
                    <Brain className="w-12 h-12 text-emerald-400" />
                </div>

                <h2 className="text-3xl font-black text-slate-900 mb-2">Playbook <span className="text-emerald-500">Pro</span></h2>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    Activate your personal offline AI tutor. <br/>
                    <span className="font-bold text-slate-700">Explains in Swanglish. Learns from your files.</span>
                </p>

                {downloadStatus ? (
                    <div className="w-full space-y-3">
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <span>{downloadStatus}</span>
                            <span>{downloadProgress}%</span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${downloadProgress}%` }}></div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">Please keep this screen open.</p>
                    </div>
                ) : (
                    <Button onClick={handleDownloadEngine} className="w-full h-14 text-lg font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xl">
                        <Download className="w-5 h-5 mr-2" /> Download Engine (~250MB)
                    </Button>
                )}

                {!downloadStatus && (
                    <p className="text-xs text-slate-400 mt-4">
                        Requires ~300MB free space. One-time download.
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-white shadow-xl border-x border-slate-100 overflow-hidden relative max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="font-bold text-slate-900 text-sm">Playbook Pro</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-500">Offline</span>
                </div>
                <div className="flex items-center gap-2">
                    {ingestedFiles.length > 0 && (
                        <div className="flex -space-x-2 mr-2">
                            {ingestedFiles.map((_, i) => (
                                <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-500">
                                    <FileText className="w-3 h-3" />
                                </div>
                            ))}
                        </div>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,.docx,.txt"
                    />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isIngesting}>
                        {isIngesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4 mr-2" />}
                        {isIngesting ? "Reading..." : "Add File"}
                    </Button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                            <Sparkles className="w-10 h-10 text-emerald-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Welcome to Playbook Pro</h3>
                        <p className="text-slate-500 max-w-sm mb-8">
                            I am your offline tutor. Upload a PDF or ask me anything. I can explain in Swanglish.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg w-full">
                            <button onClick={() => setInput("Summarize this document")} className="p-4 border border-slate-200 rounded-xl text-left hover:bg-slate-50 transition-colors">
                                <span className="block font-bold text-slate-700 text-sm mb-1">Summarize</span>
                                <span className="text-xs text-slate-400">Get a quick overview of uploaded files.</span>
                            </button>
                            <button onClick={() => setInput("Explain like I'm 5")} className="p-4 border border-slate-200 rounded-xl text-left hover:bg-slate-50 transition-colors">
                                <span className="block font-bold text-slate-700 text-sm mb-1">Simplify</span>
                                <span className="text-xs text-slate-400">Break down complex topics simply.</span>
                            </button>
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] md:max-w-[75%] p-5 rounded-2xl text-sm md:text-base leading-relaxed shadow-sm ${
                            msg.role === 'user'
                            ? 'bg-slate-900 text-white rounded-br-none'
                            : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'
                        }`}>
                            {msg.role === 'ai' && (
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                                    <div className="w-5 h-5 bg-emerald-100 rounded-md flex items-center justify-center">
                                        <Zap className="w-3 h-3 text-emerald-600 fill-current" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Playbook Pro</span>
                                </div>
                            )}
                            <div className="whitespace-pre-wrap">{msg.text}</div>
                        </div>
                    </div>
                ))}

                {isThinking && (
                    <div className="flex justify-start">
                        <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-slate-100 flex items-center gap-3 shadow-sm">
                            <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                            <span className="text-xs text-slate-400 font-medium animate-pulse">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 md:p-6 bg-white border-t border-slate-100">
                <div className="relative flex items-center shadow-sm rounded-2xl bg-slate-50 border border-slate-200 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask me anything..."
                        className="w-full h-14 pl-6 pr-14 bg-transparent border-none focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isThinking}
                        className="absolute right-2 p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-200"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <div className="text-center mt-2">
                    <p className="text-[10px] text-slate-400">Playbook Pro runs 100% offline on your device.</p>
                </div>
            </div>
        </div>
    );
};
