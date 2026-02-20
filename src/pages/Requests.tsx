import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Plus, Search, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { Request, RequestStatus } from '../types';

export const Requests: React.FC = () => {
  const { requests, addRequest, updateRequestStatus } = useData();
  const { user } = useAuth();
  const [filter, setFilter] = useState<'ALL' | RequestStatus>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<Request['type']>('LEAVE');
  const [desc, setDesc] = useState('');

  if (!user) return null;

  const isAdmin = user.role === 'HOD';
  const isSecretary = user.role === 'SECRETARY';
  const canApprove = isAdmin;

  // HOD/Sec see all, Staff sees own
  const visibleRequests = (isAdmin || isSecretary)
    ? requests
    : requests.filter(r => r.requesterId === user.id);

  const filteredRequests = filter === 'ALL'
    ? visibleRequests
    : visibleRequests.filter(r => r.status === filter);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newRequest: Request = {
      id: `r${Date.now()}`,
      title,
      type,
      description: desc,
      requesterId: user.id,
      requesterName: user.name,
      status: 'PENDING',
      date: new Date().toISOString().split('T')[0],
    };
    addRequest(newRequest);
    setIsModalOpen(false);
    setTitle('');
    setDesc('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-slate-900">Requests & Approvals</h1>
           <p className="text-slate-500 mt-1">Manage departmental workflows.</p>
        </div>
        {!isAdmin && !isSecretary && (
            <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Request
            </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
             <div className="flex space-x-2">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
                   <Button
                      key={status}
                      variant={filter === status ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setFilter(status)}
                      className="capitalize"
                   >
                      {status.toLowerCase()}
                   </Button>
                ))}
             </div>
             <div className="flex items-center space-x-2">
                <div className="relative">
                   <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                   <Input placeholder="Search..." className="pl-8 w-64 h-9" />
                </div>
                <Button variant="outline" size="sm">
                   <Filter className="h-4 w-4" />
                </Button>
             </div>
          </div>
        </CardHeader>
        <CardContent>
           <Table>
              <TableHeader>
                 <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                 </TableRow>
              </TableHeader>
              <TableBody>
                 {filteredRequests.length === 0 ? (
                    <TableRow>
                       <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                          No requests found.
                       </TableCell>
                    </TableRow>
                 ) : (
                    filteredRequests.map((req) => (
                       <TableRow key={req.id}>
                          <TableCell className="font-mono text-xs text-slate-500">{req.id}</TableCell>
                          <TableCell className="font-medium">
                             {req.title}
                             <p className="text-xs text-slate-500 truncate max-w-[200px]">{req.description}</p>
                          </TableCell>
                          <TableCell>{req.requesterName}</TableCell>
                          <TableCell>
                             <Badge variant="outline">{req.type}</Badge>
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm">{req.date}</TableCell>
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
                          <TableCell className="text-right">
                             {canApprove && req.status === 'PENDING' ? (
                                <div className="flex justify-end space-x-2">
                                   <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50"
                                      onClick={() => updateRequestStatus(req.id, 'APPROVED')}
                                      title="Approve"
                                   >
                                      <CheckCircle className="h-5 w-5" />
                                   </Button>
                                   <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                      onClick={() => updateRequestStatus(req.id, 'REJECTED')}
                                      title="Reject"
                                   >
                                      <XCircle className="h-5 w-5" />
                                   </Button>
                                </div>
                             ) : (
                                <span className="text-slate-400 text-xs">
                                   {req.status === 'PENDING' ? <Clock className="h-4 w-4 inline" /> : 'Closed'}
                                </span>
                             )}
                          </TableCell>
                       </TableRow>
                    ))
                 )}
              </TableBody>
           </Table>
        </CardContent>
      </Card>

      {/* Simple Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <Card className="w-full max-w-lg shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between">
                 <CardTitle>Submit New Request</CardTitle>
                 <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                    <XCircle className="h-5 w-5 text-slate-400" />
                 </Button>
              </CardHeader>
              <CardContent>
                 <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Request Type</label>
                       <select
                          className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                          value={type}
                          onChange={(e) => setType(e.target.value as any)}
                       >
                          <option value="LEAVE">Leave Request</option>
                          <option value="RESOURCE">Resource Request</option>
                          <option value="TRAVEL">Travel Request</option>
                          <option value="OTHER">Other</option>
                       </select>
                    </div>
                    <Input
                       label="Subject"
                       placeholder="e.g. Medical Leave for 3 Days"
                       value={title}
                       onChange={e => setTitle(e.target.value)}
                       required
                    />
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                       <textarea
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[100px]"
                          placeholder="Provide details..."
                          value={desc}
                          onChange={e => setDesc(e.target.value)}
                          required
                       />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                       <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                       <Button type="submit">Submit Request</Button>
                    </div>
                 </form>
              </CardContent>
           </Card>
        </div>
      )}
    </div>
  );
};
