import { useState } from 'react';
import { Button } from '../ui/Button';
import { Book, GraduationCap, School } from 'lucide-react';

interface CoverPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: CoverPageData) => void;
}

export interface CoverPageData {
  title: string;
  studentName: string;
  regNo: string;
  course: string;
  university: string;
  template: 'standard' | 'modern' | 'classic';
}

export const CoverPageModal = ({ isOpen, onClose, onApply }: CoverPageModalProps) => {
  const [data, setData] = useState<CoverPageData>({
    title: 'Research Proposal',
    studentName: 'John Doe',
    regNo: 'BS-CS-2024-001',
    course: 'Computer Science',
    university: 'University of Dar es Salaam',
    template: 'standard'
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
           <h3 className="font-bold text-lg text-slate-900">Add Smart Cover Page</h3>
           <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="p-6 space-y-4">
            {/* Template Selection */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                {['standard', 'modern', 'classic'].map((t) => (
                    <button
                        key={t}
                        onClick={() => setData({ ...data, template: t as any })}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${data.template === t ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-emerald-200 text-slate-500'}`}
                    >
                        {t === 'standard' && <School className="w-6 h-6" />}
                        {t === 'modern' && <Book className="w-6 h-6" />}
                        {t === 'classic' && <GraduationCap className="w-6 h-6" />}
                        <span className="text-[10px] font-bold uppercase">{t}</span>
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                <input
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-emerald-500 outline-none transition-colors"
                    placeholder="Document Title"
                    value={data.title}
                    onChange={(e) => setData({...data, title: e.target.value})}
                />
                <input
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-emerald-500 outline-none transition-colors"
                    placeholder="Student Name"
                    value={data.studentName}
                    onChange={(e) => setData({...data, studentName: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-3">
                    <input
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-emerald-500 outline-none transition-colors"
                        placeholder="Reg No"
                        value={data.regNo}
                        onChange={(e) => setData({...data, regNo: e.target.value})}
                    />
                    <input
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-emerald-500 outline-none transition-colors"
                        placeholder="Course Code"
                        value={data.course}
                        onChange={(e) => setData({...data, course: e.target.value})}
                    />
                </div>
                <input
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-emerald-500 outline-none transition-colors"
                    placeholder="University Name"
                    value={data.university}
                    onChange={(e) => setData({...data, university: e.target.value})}
                />
            </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onApply(data)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Generate Cover
            </Button>
        </div>
      </div>
    </div>
  );
};
