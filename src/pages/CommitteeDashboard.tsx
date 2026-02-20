import React from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { FileLock, Users, Bell } from 'lucide-react';

export const CommitteeDashboard: React.FC = () => {
  const { notices, documents } = useData();
  const { user } = useAuth();

  if (!user) return null;

  const relevantNotices = notices.filter(n => n.targetRoles.includes('COMMITTEE'));
  const secureDocs = documents.filter(d => d.accessLevel.includes('COMMITTEE'));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Committee Panel</h1>
        <Badge variant="warning" className="px-3 py-1">Restricted Access</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-900 text-white border-none shadow-lg shadow-slate-900/20">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-slate-700">
              <CardTitle className="text-sm font-medium text-slate-300">Secure Documents</CardTitle>
              <FileLock className="h-4 w-4 text-emerald-400" />
           </CardHeader>
           <CardContent>
              <div className="text-2xl font-bold">{secureDocs.length}</div>
              <p className="text-xs text-slate-400">Encrypted & Logged</p>
           </CardContent>
        </Card>

        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Committee Members</CardTitle>
              <Users className="h-4 w-4 text-slate-500" />
           </CardHeader>
           <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-slate-500">Active Session</p>
           </CardContent>
        </Card>

        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Internal Memos</CardTitle>
              <Bell className="h-4 w-4 text-slate-500" />
           </CardHeader>
           <CardContent>
              <div className="text-2xl font-bold">{relevantNotices.length}</div>
              <p className="text-xs text-slate-500">Confidential</p>
           </CardContent>
        </Card>
      </div>

      <Card>
         <CardHeader>
            <CardTitle>Secure Document Vault</CardTitle>
         </CardHeader>
         <CardContent>
            <Table>
               <TableHeader>
                  <TableRow>
                     <TableHead>Document Name</TableHead>
                     <TableHead>Classification</TableHead>
                     <TableHead>Uploaded By</TableHead>
                     <TableHead className="text-right">Access Log</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {secureDocs.map((doc) => (
                     <TableRow key={doc.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                           <FileLock className="h-4 w-4 text-amber-500" />
                           {doc.title}
                        </TableCell>
                        <TableCell>
                           <Badge variant="error">CONFIDENTIAL</Badge>
                        </TableCell>
                        <TableCell className="text-slate-500">{doc.uploadedBy}</TableCell>
                        <TableCell className="text-right text-xs font-mono text-slate-400">
                           {doc.id}-LOG-234
                        </TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>
         </CardContent>
      </Card>
    </div>
  );
};
