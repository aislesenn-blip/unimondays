import React from 'react';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Calendar, FileText, Upload, Plus } from 'lucide-react';

export const SecretaryDashboard: React.FC = () => {
  const { documents } = useData();
  const navigate = useNavigate();
  const recentDocs = documents.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Secretary Dashboard</h1>
        <div className="space-x-2">
            <Button variant="secondary" onClick={() => navigate('/vault')}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Doc
            </Button>
            <Button onClick={() => navigate('/notices')}>
                <Plus className="mr-2 h-4 w-4" />
                New Memo
            </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Department Calendar</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex items-center justify-center h-48 bg-slate-50 rounded-lg border border-slate-100 text-slate-400">
                <Calendar className="h-8 w-8 mr-2" />
                <span>Calendar Widget</span>
             </div>
          </CardContent>
        </Card>

        <Card className="col-span-2">
           <CardHeader>
              <CardTitle>Recent Documents</CardTitle>
           </CardHeader>
           <CardContent>
              <Table>
                <TableHeader>
                   <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {recentDocs.map((doc) => (
                      <TableRow key={doc.id}>
                         <TableCell className="font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            {doc.title}
                         </TableCell>
                         <TableCell>
                            <Badge variant="outline">{doc.category}</Badge>
                         </TableCell>
                         <TableCell className="text-slate-500">{doc.uploadDate}</TableCell>
                         <TableCell className="text-right">
                            <Button variant="ghost" size="sm">View</Button>
                         </TableCell>
                      </TableRow>
                   ))}
                </TableBody>
              </Table>
           </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
         <Card>
            <CardHeader>
               <CardTitle>Draft Notices</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="text-center py-8 text-slate-500">
                  No drafts pending approval.
               </div>
            </CardContent>
         </Card>
         <Card>
            <CardHeader>
               <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-4 border-slate-100">
                     <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold">24</div>
                        <div>
                           <p className="font-medium text-slate-900">Department Meeting</p>
                           <p className="text-xs text-slate-500">10:00 AM - Conf Room A</p>
                        </div>
                     </div>
                     <Badge variant="success">Confirmed</Badge>
                  </div>
                  <div className="flex items-center justify-between border-b pb-4 border-slate-100">
                     <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center font-bold">28</div>
                        <div>
                           <p className="font-medium text-slate-900">Guest Lecture: AI Ethics</p>
                           <p className="text-xs text-slate-500">2:00 PM - Hall 3</p>
                        </div>
                     </div>
                     <Badge variant="warning">Tentative</Badge>
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
};
