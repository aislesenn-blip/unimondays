import { useState, useRef } from 'react';
import { Button } from '../ui/Button';
import { LayoutTemplate, ListOrdered, FileType, CheckCircle, ChevronRight, User, BookOpen, PenTool, X } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

interface MetadataStepProps {
  onData: (metadata: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export const MetadataStep = ({ onData, onNext, onBack }: MetadataStepProps) => {
  const [formData, setFormData] = useState({
     name: '',
     regNo: '',
     course: '',
     lecturer: '',
     title: '',
     groupCode: '',
     sectionName: '',
     style: 'standard', // standard | formal
     coverPage: true,
     pageNumbers: true,
     toc: false,
     signature: null as string | null
  });

  const sigPadRef = useRef<SignatureCanvas>(null);
  const [showSigPad, setShowSigPad] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const saveSignature = () => {
      if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
          setFormData(prev => ({ ...prev, signature: sigPadRef.current?.toDataURL() || null }));
          setShowSigPad(false);
      } else {
          setShowSigPad(false);
      }
  };

  const clearSignature = () => {
      sigPadRef.current?.clear();
      setFormData(prev => ({ ...prev, signature: null }));
  };

  const handleContinue = () => {
    if (!formData.name.trim() || !formData.title.trim()) {
      alert("Please enter at least your name and title.");
      return;
    }
    onData(formData);
    onNext();
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-500">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-500" />
          Document Metadata
        </h2>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Ernest K."
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
           </div>
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reg No</label>
              <input
                name="regNo"
                value={formData.regNo}
                onChange={handleChange}
                placeholder="e.g. 2023-04-001"
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
           </div>
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Course Code</label>
              <input
                name="course"
                value={formData.course}
                onChange={handleChange}
                placeholder="e.g. CS 101"
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
           </div>
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lecturer</label>
              <input
                name="lecturer"
                value={formData.lecturer}
                onChange={handleChange}
                placeholder="e.g. Dr. M"
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
           </div>
           <div className="col-span-full">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Document Title</label>
              <input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Final Project Report"
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-lg"
              />
           </div>
        </div>

        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 border-t border-slate-100 pt-4">
          <User className="w-4 h-4 text-emerald-500" />
          Group Workspace (Optional)
        </h3>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Group Code</label>
              <input
                name="groupCode"
                value={formData.groupCode}
                onChange={handleChange}
                placeholder="e.g. GRP-101"
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
           </div>
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Section Name</label>
              <input
                name="sectionName"
                value={formData.sectionName}
                onChange={handleChange}
                placeholder="e.g. Introduction"
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
           </div>
        </div>

        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 border-t border-slate-100 pt-4">
          <BookOpen className="w-4 h-4 text-emerald-500" />
          Formatting Rules
        </h3>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
           <button
             onClick={() => setFormData({...formData, style: 'standard'})}
             className={`p-4 rounded-xl border-2 text-left transition-all ${formData.style === 'standard' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
           >
              <div className="flex items-center justify-between mb-2">
                 <span className="font-bold text-slate-900">University Standard</span>
                 {formData.style === 'standard' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
              </div>
              <p className="text-xs text-slate-500 leading-tight">Times New Roman, 12pt, 1.5 Spacing. Best for assignments.</p>
           </button>

           <button
             onClick={() => setFormData({...formData, style: 'formal'})}
             className={`p-4 rounded-xl border-2 text-left transition-all ${formData.style === 'formal' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
           >
              <div className="flex items-center justify-between mb-2">
                 <span className="font-bold text-slate-900">Formal Report</span>
                 {formData.style === 'formal' && <CheckCircle className="w-5 h-5 text-indigo-500" />}
              </div>
              <p className="text-xs text-slate-500 leading-tight">Arial, 11pt, 1.15 Spacing. Clean and modern look.</p>
           </button>
        </div>

        <div className="flex flex-col gap-3">
           <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-3">
                 <LayoutTemplate className="w-5 h-5 text-slate-400" />
                 <span className="font-medium text-slate-700 text-sm">Add Cover Page</span>
              </div>
              <input type="checkbox" checked={formData.coverPage} onChange={() => setFormData({...formData, coverPage: !formData.coverPage})} className="accent-emerald-500 w-5 h-5" />
           </label>

           <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-3">
                 <FileType className="w-5 h-5 text-slate-400" />
                 <span className="font-medium text-slate-700 text-sm">Add Page Numbers</span>
              </div>
              <input type="checkbox" checked={formData.pageNumbers} onChange={() => setFormData({...formData, pageNumbers: !formData.pageNumbers})} className="accent-emerald-500 w-5 h-5" />
           </label>

           <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors opacity-50 cursor-not-allowed" title="Coming Soon">
              <div className="flex items-center gap-3">
                 <ListOrdered className="w-5 h-5 text-slate-400" />
                 <span className="font-medium text-slate-700 text-sm">Auto-Generate TOC (Beta)</span>
              </div>
              <input type="checkbox" checked={formData.toc} disabled className="accent-emerald-500 w-5 h-5" />
           </label>

           <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-3">
                 <PenTool className="w-5 h-5 text-slate-400" />
                 <span className="font-medium text-slate-700 text-sm">Digital Signature</span>
              </div>
              {formData.signature ? (
                  <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-600 font-bold">Signed</span>
                      <button onClick={clearSignature} className="text-red-400 hover:text-red-600"><X className="w-4 h-4"/></button>
                  </div>
              ) : (
                  <Button size="sm" variant="outline" onClick={() => setShowSigPad(true)}>Sign Now</Button>
              )}
           </div>
        </div>

      </div>

      {showSigPad && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl p-4 shadow-2xl w-full max-w-md">
                  <h3 className="font-bold text-lg mb-2 text-slate-900">Sign Below</h3>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl mb-4 bg-slate-50">
                      <SignatureCanvas
                          ref={sigPadRef}
                          canvasProps={{ className: 'w-full h-40' }}
                          backgroundColor="rgba(248, 250, 252, 1)"
                      />
                  </div>
                  <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowSigPad(false)} className="flex-1">Cancel</Button>
                      <Button onClick={() => sigPadRef.current?.clear()} variant="ghost" className="flex-1 text-red-500 hover:text-red-600">Clear</Button>
                      <Button onClick={saveSignature} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">Save</Button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex gap-4">
         <Button variant="outline" onClick={onBack} className="flex-1 h-14 text-lg font-bold border-slate-300 text-slate-500 hover:bg-slate-100">
           Back
         </Button>
         <Button onClick={handleContinue} className="flex-[2] h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-200">
           Generate Document <ChevronRight className="w-5 h-5 ml-2" />
         </Button>
      </div>
    </div>
  );
};
