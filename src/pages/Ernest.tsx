import { useState } from 'react';
import { ErnestPro } from '../components/ernest/ErnestPro';
import { Zap, Download, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

export const Ernest = () => {
  const [mode, setMode] = useState<'selection' | 'lite' | 'pro'>('selection');

  if (mode === 'selection') {
    return (
      <div className="h-[calc(100vh-140px)] flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
           <div className="text-center space-y-2">
             <h1 className="text-3xl font-bold text-slate-900">Choose Your Partner</h1>
             <p className="text-slate-500">Select how you want to use Ernest AI.</p>
           </div>

           <div className="grid gap-4">
              {/* Lite Option */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setMode('lite')}
                className="flex items-start gap-4 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500 transition-all text-left group"
              >
                 <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors">
                    <Globe className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-900 text-lg">Ernest Lite (Online)</h3>
                    <p className="text-slate-500 text-sm mt-1">
                       Fast, lightweight, and perfect for basic chat. Requires internet connection.
                    </p>
                    <span className="inline-block mt-3 text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-md">
                       Instant Access
                    </span>
                 </div>
              </motion.button>

              {/* Pro Option */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setMode('pro')}
                className="flex items-start gap-4 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500 transition-all text-left group"
              >
                 <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-100 transition-colors">
                    <Zap className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-900 text-lg">Ernest Pro (Offline)</h3>
                    <p className="text-slate-500 text-sm mt-1">
                       Powerful local AI model. Works without internet forever after download.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                       <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md flex items-center gap-1">
                          <Download className="w-3 h-3" /> 270MB Download
                       </span>
                    </div>
                 </div>
              </motion.button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] w-full flex flex-col">
      {/*
         In a real implementation, 'lite' would use a different component or API.
         For this demo, we'll reuse ErnestPro but effectively 'Lite' users
         wouldn't trigger the heavy worker if we had a separate 'ErnestLite'.
         Since the requirement is to STOP auto-download, by putting it behind this gate,
         we ensure the worker init (and download) only happens if they enter this view.

         To strictly separate, we could pass a prop to ErnestPro or use a different component.
         For now, passing the mode to ErnestPro could let it decide whether to load the model or mock it.
      */}
      <ErnestPro mode={mode} />
    </div>
  );
};
