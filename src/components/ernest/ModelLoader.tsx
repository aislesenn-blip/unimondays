import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { Download, Smartphone } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface ModelLoaderProps {
  onModelReady: () => void;
  isReady: boolean;
}

export const ModelLoader = ({ onModelReady, isReady }: ModelLoaderProps) => {
  const { connectionType } = useNetworkStatus();
  const [showModal, setShowModal] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  const startDownload = () => {
    setIsDownloading(true);
    setShowModal(false);

    // Simulate ~80MB download over time
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setHasDownloaded(true);
        setIsDownloading(false);
        onModelReady();
      } else {
        setDownloadProgress(progress);
      }
    }, 100);
  };

  useEffect(() => {
    // If we haven't downloaded and aren't downloading
    if (!hasDownloaded && !isDownloading) {
        if (connectionType === 'wifi') {
             // Simulate auto-download on WiFi
             startDownload();
        } else if (connectionType === 'cellular') {
             // Stop and trigger modal on Cellular
             setShowModal(true);
        }
    }
  }, [connectionType, hasDownloaded, isDownloading]);


  return (
    <>
       {/* Status Indicator in Header (Usually) */}
       <div className="flex items-center gap-2">
         {isReady ? (
           <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-medium tracking-wide">OFFLINE READY • ZERO DATA</span>
           </div>
         ) : (
           <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
             <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
             <span className="text-[10px] font-medium tracking-wide">LITE MODE</span>
           </div>
         )}

         {isDownloading && (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
                <Download className="w-3 h-3 animate-bounce" />
                <span>Downloading Intelligence... {Math.round(downloadProgress)}%</span>
            </div>
         )}
       </div>

       {/* Apple-Style Cellular Warning Modal */}
       <AnimatePresence>
         {showModal && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
           >
             <motion.div
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
             >
                <div className="p-6 text-center">
                   <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center mb-4">
                      <Smartphone className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                   </div>
                   <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Download Intelligence Model?</h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                     Ernest requires ~80MB for offline capabilities. You are currently on cellular data.
                   </p>

                   <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => setShowModal(false)}
                        className="w-full"
                      >
                        Wait for Wi-Fi
                      </Button>
                      <Button
                        onClick={startDownload}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        Download Now
                      </Button>
                   </div>
                </div>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>
    </>
  );
};
