import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Search, FileText, Upload, Lock, Unlock, Download } from 'lucide-react';
import type { Document } from '../types';

export const Vault: React.FC = () => {
  const { documents, addDocument } = useData();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Upload State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Document['category']>('POLICY');
  const [isConfidential, setIsConfidential] = useState(false);

  if (!user) return null;

  const canUpload = ['HOD', 'SECRETARY'].includes(user.role);

  const visibleDocs = documents.filter(d => d.accessLevel.includes(user.role));

  const filteredDocs = visibleDocs.filter(d =>
    d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const newDoc: Document = {
      id: `d${Date.now()}`,
      title,
      category,
      uploadedBy: user.name,
      uploadDate: new Date().toISOString().split('T')[0],
      url: '#',
      accessLevel: isConfidential
        ? ['HOD', 'SECRETARY', 'COMMITTEE']
        : ['HOD', 'SECRETARY', 'STAFF', 'COMMITTEE'],
    };
    addDocument(newDoc);
    setIsModalOpen(false);
    setTitle('');
    setIsConfidential(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-slate-900">Digital Vault</h1>
           <p className="text-slate-500 mt-1">Secure document repository.</p>
        </div>
        {canUpload && (
            <Button onClick={() => setIsModalOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
            </Button>
        )}
      </div>

      <Card>
         <CardHeader>
            <div className="flex items-center justify-between">
               <CardTitle>Document Index</CardTitle>
               <div className="relative w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                     placeholder="Search archives..."
                     className="pl-9 bg-slate-50 border-slate-200"
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                  />
               </div>
            </div>
         </CardHeader>
         <CardContent>
            <Table>
               <TableHeader>
                  <TableRow>
                     <TableHead className="w-[50px]"></TableHead>
                     <TableHead>Document Name</TableHead>
                     <TableHead>Category</TableHead>
                     <TableHead>Uploaded By</TableHead>
                     <TableHead>Date</TableHead>
                     <TableHead>Access</TableHead>
                     <TableHead className="text-right">Action</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {filteredDocs.length === 0 ? (
                     <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                           No documents found matching "{searchTerm}"
                        </TableCell>
                     </TableRow>
                  ) : (
                     filteredDocs.map((doc) => (
                        <TableRow key={doc.id}>
                           <TableCell>
                              <FileText className="h-5 w-5 text-slate-400" />
                           </TableCell>
                           <TableCell className="font-medium text-slate-900">{doc.title}</TableCell>
                           <TableCell>
                              <Badge variant="outline">{doc.category}</Badge>
                           </TableCell>
                           <TableCell className="text-slate-500">{doc.uploadedBy}</TableCell>
                           <TableCell className="text-slate-500 font-mono text-xs">{doc.uploadDate}</TableCell>
                           <TableCell>
                              {doc.accessLevel.length < 4 ? (
                                 <div className="flex items-center text-amber-600 text-xs font-medium">
                                    <Lock className="h-3 w-3 mr-1" />
                                    Restricted
                                 </div>
                              ) : (
                                 <div className="flex items-center text-emerald-600 text-xs font-medium">
                                    <Unlock className="h-3 w-3 mr-1" />
                                    Public
                                 </div>
                              )}
                           </TableCell>
                           <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                                 <Download className="h-4 w-4" />
                              </Button>
                           </TableCell>
                        </TableRow>
                     ))
                  )}
               </TableBody>
            </Table>
         </CardContent>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <Card className="w-full max-w-lg shadow-2xl">
              <CardHeader>
                 <CardTitle>Archive New Document</CardTitle>
              </CardHeader>
              <CardContent>
                 <form onSubmit={handleUpload} className="space-y-4">
                    <Input
                       label="Document Title"
                       placeholder="e.g. Q4 Budget Report"
                       value={title}
                       onChange={e => setTitle(e.target.value)}
                       required
                    />
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                       <select
                          className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                          value={category}
                          onChange={(e) => setCategory(e.target.value as any)}
                       >
                          <option value="POLICY">Policy Document</option>
                          <option value="MINUTES">Meeting Minutes</option>
                          <option value="SYLLABUS">Syllabus</option>
                          <option value="EXAM">Exam Material</option>
                          <option value="OTHER">Other</option>
                       </select>
                    </div>
                    <div className="flex items-center space-x-2 border p-3 rounded-md bg-slate-50">
                       <input
                          type="checkbox"
                          id="confidential"
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          checked={isConfidential}
                          onChange={e => setIsConfidential(e.target.checked)}
                       />
                       <label htmlFor="confidential" className="text-sm font-medium text-slate-900 cursor-pointer">
                          Mark as Confidential (Restricted Access)
                       </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                       <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                       <Button type="submit">Upload & Archive</Button>
                    </div>
                 </form>
              </CardContent>
           </Card>
        </div>
      )}
    </div>
  );
};
