import { useState } from 'react';
import { Button } from '../ui/Button';
import { Zap, Download, Loader2 } from 'lucide-react';

interface LiteAssistantProps {
    isReady: boolean;
    onReady: () => void;
}

export const LiteAssistant = ({ isReady, onReady }: LiteAssistantProps) => {
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleDownload = async () => {
        setDownloading(true);
        // Simulation for now - will implement real download in next steps
        let p = 0;
        const interval = setInterval(() => {
            p += 5;
            setProgress(p);
            if (p >= 100) {
                clearInterval(interval);
                setDownloading(false);
                onReady();
            }
        }, 100);
    };

    if (isReady) return null;

    return (
        <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow-lg mb-8 mx-auto max-w-2xl relative z-10">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500 rounded-lg shadow-lg shadow-emerald-500/20">
                    <Zap className="w-5 h-5 text-white fill-current" />
                </div>
                <div>
                    <h4 className="font-bold text-sm">Enable Offline Intelligence</h4>
                    <p className="text-xs text-slate-400">Download Smart Assistant (400MB) for offline grammar.</p>
                </div>
            </div>

            <Button
                size="sm"
                onClick={handleDownload}
                disabled={downloading}
                className="bg-white text-slate-900 hover:bg-slate-100 border-none font-bold"
            >
                {downloading ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {progress}%
                    </>
                ) : (
                    <>
                        <Download className="w-4 h-4 mr-2" /> Download
                    </>
                )}
            </Button>
        </div>
    );
};
