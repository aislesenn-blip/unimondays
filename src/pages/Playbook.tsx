import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Editor } from '../components/playbook/Editor';
import { ChevronLeft } from 'lucide-react';

export const Playbook = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
                 <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/home')} className="-ml-2 text-slate-500 hover:text-slate-900">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-slate-900 text-lg flex items-center gap-2 leading-none">
                            Playbook <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase rounded tracking-widest">Smart Editor</span>
                        </h1>
                        <p className="text-[10px] text-slate-400 font-medium">Untitled Document</p>
                    </div>
                 </div>

                 {/* Top Right Toggle could go here if needed, but Editor has Lite Banner */}
            </div>

            {/* Editor Workspace */}
            <div className="flex-1 overflow-y-auto bg-slate-100/50 pt-8 pb-32 scroll-smooth">
                 <Editor />
            </div>
        </div>
    );
};
