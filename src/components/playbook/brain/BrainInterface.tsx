import { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/Button';
import { Brain, Download, Loader2, Send, Paperclip, Sparkles, Zap } from 'lucide-react';
import SLMWorker from '../../../workers/slmWorker?worker';

export const BrainInterface = () => {
    const [isEngineReady, setIsEngineReady] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadStatus, setDownloadStatus] = useState('');
    const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);

    const workerRef = useRef<Worker | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Init Worker
        workerRef.current = new SLMWorker();

        workerRef.current.onmessage = (e) => {
            const { status, progress, message, text } = e.data;

            if (status === 'progress') {
                setDownloadProgress(Math.round(progress || 0)); // transformers.js sends 0-100 usually? No 0-1 actually. Or percent.
                // If it's a large number, it might be bytes.
                // pipeline callback 'progress' is usually 0 to 100.
                if (progress && progress <= 1) setDownloadProgress(Math.round(progress * 100));
                else if (progress) setDownloadProgress(Math.round(progress));

                setDownloadStatus(message || 'Downloading...');
            } else if (status === 'ready') {
                setIsEngineReady(true);
            } else if (status === 'response') {
                setIsThinking(false);
                setMessages(prev => [...prev, { role: 'ai', text: text.replace("Playbook:", "").trim() }]);
            } else if (status === 'error') {
                setIsThinking(false);
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

    if (!isEngineReady) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] p-6 text-center max-w-md mx-auto animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-slate-200">
                    <Brain className="w-12 h-12 text-emerald-400" />
                </div>

                <h2 className="text-3xl font-black text-slate-900 mb-2">Playbook <span className="text-emerald-500">Brain</span></h2>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    Activate your personal offline AI tutor. <br/>
                    <span className="font-bold text-slate-700">Explains concepts in Swanglish. Zero Data Usage.</span>
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
        <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
            {/* Header */}
            <div className="bg-slate-50/80 backdrop-blur p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="font-bold text-slate-700 text-sm">Playbook Neural Engine (Offline)</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => alert("Upload Unlimited Docs feature coming in Phase 2!")}>
                    <Paperclip className="w-4 h-4 text-slate-400" />
                </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.length === 0 && (
                    <div className="text-center mt-20 opacity-50">
                        <Sparkles className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-400 font-medium">Ask me anything in Swanglish!</p>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                            msg.role === 'user'
                            ? 'bg-slate-900 text-white rounded-br-none'
                            : 'bg-emerald-50 text-slate-800 rounded-bl-none border border-emerald-100'
                        }`}>
                            {msg.role === 'ai' && <div className="flex items-center gap-1 mb-1 text-[10px] font-bold text-emerald-600 uppercase tracking-wider"><Zap className="w-3 h-3 fill-current" /> Playbook</div>}
                            {msg.text}
                        </div>
                    </div>
                ))}

                {isThinking && (
                    <div className="flex justify-start">
                        <div className="bg-slate-50 p-4 rounded-2xl rounded-bl-none border border-slate-100 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                            <span className="text-xs text-slate-400 font-medium">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100">
                <div className="relative flex items-center">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type a message..."
                        className="w-full h-12 pl-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isThinking}
                        className="absolute right-2 p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
