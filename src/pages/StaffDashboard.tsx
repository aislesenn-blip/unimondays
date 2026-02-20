import React from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { PlusCircle, Clock, CheckCircle2, AlertTriangle, FileCheck } from 'lucide-react';

export const StaffDashboard: React.FC = () => {
  const { requests, notices } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const myRequests = requests.filter(r => r.requesterId === user.id);
  const relevantNotices = notices.filter(n => n.targetRoles.includes(user.role)).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Academic Dashboard</h1>
        <Button onClick={() => navigate('/requests')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Request
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900 text-white border-none shadow-lg shadow-slate-900/20">
            <CardContent className="p-6">
               <div className="flex justify-between items-start">
                  <div>
                     <p className="text-slate-400 text-sm font-medium">Active Requests</p>
                     <h3 className="text-3xl font-bold mt-2">{myRequests.filter(r => r.status === 'PENDING').length}</h3>
                  </div>
                  <Clock className="h-6 w-6 text-slate-400" />
               </div>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="p-6">
               <div className="flex justify-between items-start">
                  <div>
                     <p className="text-slate-500 text-sm font-medium">Approved</p>
                     <h3 className="text-3xl font-bold mt-2 text-emerald-600">{myRequests.filter(r => r.status === 'APPROVED').length}</h3>
                  </div>
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
               </div>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="p-6">
               <div className="flex justify-between items-start">
                  <div>
                     <p className="text-slate-500 text-sm font-medium">Rejected</p>
                     <h3 className="text-3xl font-bold mt-2 text-red-600">{myRequests.filter(r => r.status === 'REJECTED').length}</h3>
                  </div>
                  <AlertTriangle className="h-6 w-6 text-red-500" />
               </div>
            </CardContent>
        </Card>
        <Card>
             <CardContent className="p-6">
               <div className="flex justify-between items-start">
                  <div>
                     <p className="text-slate-500 text-sm font-medium">Unread Notices</p>
                     <h3 className="text-3xl font-bold mt-2 text-blue-600">
                        {relevantNotices.filter(n => !n.readBy.includes(user.id)).length}
                     </h3>
                  </div>
                  <FileCheck className="h-6 w-6 text-blue-500" />
               </div>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
         <Card className="col-span-2">
            <CardHeader>
               <CardTitle>My Requests History</CardTitle>
            </CardHeader>
            <CardContent>
               <Table>
                 <TableHeader>
                    <TableRow>
                       <TableHead>Title</TableHead>
                       <TableHead>Type</TableHead>
                       <TableHead>Date</TableHead>
                       <TableHead>Status</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                    {myRequests.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-slate-500">No requests found</TableCell>
                        </TableRow>
                    ) : (
                        myRequests.map((req) => (
                        <TableRow key={req.id}>
                            <TableCell className="font-medium">{req.title}</TableCell>
                            <TableCell>{req.type}</TableCell>
                            <TableCell className="text-slate-500">{req.date}</TableCell>
                            <TableCell>
                                <Badge
                                    variant={
                                        req.status === 'APPROVED' ? 'success' :
                                        req.status === 'REJECTED' ? 'error' : 'warning'
                                    }
                                >
                                    {req.status}
                                </Badge>
                            </TableCell>
                        </TableRow>
                        ))
                    )}
                 </TableBody>
               </Table>
            </CardContent>
         </Card>

         <Card>
            <CardHeader>
               <CardTitle>Department Notices</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                  {relevantNotices.map(notice => (
                     <div key={notice.id} className="border-l-4 border-blue-500 pl-4 py-1">
                        <p className="text-sm font-semibold text-slate-900">{notice.title}</p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notice.content}</p>
                        <p className="text-[10px] text-slate-400 mt-2">{notice.date}</p>
                     </div>
                  ))}
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
};
