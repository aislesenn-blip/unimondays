import { useState } from 'react';
import { ErnestLite } from '../components/ernest/ErnestLite';
import { ErnestPro } from '../components/ernest/ErnestPro';
import { ModelLoader } from '../components/ernest/ModelLoader';
import { motion, AnimatePresence } from 'framer-motion';

export const Ernest = () => {
  const [isModelReady, setIsModelReady] = useState(false);
  const [mode, setMode] = useState<'lite' | 'pro'>('lite');

  const handleModelReady = () => {
    setIsModelReady(true);
    // Auto switch to pro if user prefers or just show option
    // Prompt says "Green + Text: Offline Ready"
    // Let's allow user to toggle manually, but default to Lite if not ready
  };

  return (
    <div className="h-full flex flex-col p-4 gap-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1 tracking-tight">Ernest AI</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Your intelligent academic companion.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
           {/* Mode Switcher */}
           <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-full flex items-center">
              <button
                onClick={() => setMode('lite')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${mode === 'lite' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}
              >
                Lite Search
              </button>
              <button
                onClick={() => isModelReady && setMode('pro')}
                disabled={!isModelReady}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${mode === 'pro' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'} ${!isModelReady ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                AI Studio
              </button>
           </div>

           <ModelLoader isReady={isModelReady} onModelReady={handleModelReady} />
        </div>
      </div>

      <div className="flex-1 relative min-h-[500px]">
         <AnimatePresence mode="wait">
            {mode === 'lite' ? (
              <motion.div
                key="lite"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <ErnestLite />
              </motion.div>
            ) : (
              <motion.div
                key="pro"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                <ErnestPro />
              </motion.div>
            )}
         </AnimatePresence>
      </div>
    </div>
  );
};
