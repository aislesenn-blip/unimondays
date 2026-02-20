import React from 'react';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { FileText, Users, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export const HODDashboard: React.FC = () => {
  const { requests, notices, updateRequestStatus } = useData();
  const navigate = useNavigate();

  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const totalStaff = 12; // Mock number
  const urgentNotices = notices.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">HOD Dashboard</h1>
        <Button onClick={() => navigate('/notices')}>Create Announcement</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <AlertCircle className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            <p className="text-xs text-slate-500">Requires attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStaff}</div>
            <p className="text-xs text-slate-500">Active members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Department Notices</CardTitle>
            <FileText className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{urgentNotices}</div>
            <p className="text-xs text-slate-500">Posted this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requester</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-slate-500">No pending requests</TableCell>
                    </TableRow>
                ) : (
                    pendingRequests.map((request) => (
                    <TableRow key={request.id}>
                        <TableCell className="font-medium text-xs md:text-sm">{request.requesterName}</TableCell>
                        <TableCell className="text-xs md:text-sm truncate max-w-[150px]">{request.title}</TableCell>
                        <TableCell className="text-xs">{request.type}</TableCell>
                        <TableCell>
                        <Badge variant="warning">Pending</Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => updateRequestStatus(request.id, 'APPROVED')}
                            title="Approve"
                        >
                            <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => updateRequestStatus(request.id, 'REJECTED')}
                            title="Reject"
                        >
                            <XCircle className="h-4 w-4" />
                        </Button>
                        </TableCell>
                    </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Latest Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notices.slice(0, 3).map((notice) => (
                <div key={notice.id} className="flex items-start gap-4 rounded-md border p-3 border-slate-100">
                  <div className="mt-1 bg-slate-100 p-2 rounded-full">
                    <FileText className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{notice.title}</p>
                    <p className="text-xs text-slate-500 line-clamp-2">{notice.content}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{notice.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
