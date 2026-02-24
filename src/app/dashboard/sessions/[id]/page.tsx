"use client";

import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SESSIONS, WORKS } from "@/lib/mock-data";
import { Plus, FileText, BarChart2, Users, Download, ArrowRight, BookOpen, Clock } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function SessionDetailsPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const session = SESSIONS.find(s => s.id === sessionId) || SESSIONS[0];
  const sessionWorks = WORKS.filter(w => w.sessionId === session.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{session.courseCode}</h2>
          <p className="text-muted-foreground">{session.courseName} • {session.semester}</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline">
             <Download className="mr-2 h-4 w-4" />
             Export Report
           </Button>
           <Button variant="destructive">
             Archive Session
           </Button>
        </div>
      </div>

      <Tabs defaultValue="works" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="works">Works</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <CardTitle className="text-sm font-medium">Enrolled Students</CardTitle>
                 <Users className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold">{session.studentsCount}</div>
               </CardContent>
             </Card>
             <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <CardTitle className="text-sm font-medium">Total Works</CardTitle>
                 <FileText className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold">{session.worksCount}</div>
               </CardContent>
             </Card>
             <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <CardTitle className="text-sm font-medium">Average Attendance</CardTitle>
                 <BookOpen className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold">88%</div>
               </CardContent>
             </Card>
             <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <CardTitle className="text-sm font-medium">Next Deadline</CardTitle>
                 <Clock className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold">Mar 15</div>
               </CardContent>
             </Card>
           </div>
        </TabsContent>

        <TabsContent value="works" className="space-y-4">
           <div className="flex justify-between items-center">
             <h3 className="text-xl font-semibold tracking-tight">Course Works</h3>
             <Link href={`/dashboard/sessions/${sessionId}/work/create`} className={cn(buttonVariants())}>
                 <Plus className="mr-2 h-4 w-4" />
                 Create Work
             </Link>
           </div>

           <div className="grid gap-4">
             {sessionWorks.length === 0 ? (
               <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
                 <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                 <p className="text-lg font-medium">No works created yet</p>
                 <p className="text-sm text-muted-foreground mb-4">Get started by creating a new quiz, exam, or assignment.</p>
                 <Link href={`/dashboard/sessions/${sessionId}/work/create`} className={cn(buttonVariants({ variant: "outline" }))}>Create Work</Link>
               </div>
             ) : (
               sessionWorks.map((work) => (
                 <Card key={work.id} className="hover:shadow-md transition-all duration-200">
                   <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <div className="space-y-1">
                       <CardTitle className="text-lg font-bold">{work.title}</CardTitle>
                       <CardDescription>{work.type} • {work.mode}</CardDescription>
                     </div>
                     <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                       work.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                       work.status === 'GRADING' ? 'bg-yellow-100 text-yellow-700' :
                       'bg-gray-100 text-gray-700'
                     }`}>
                       {work.status}
                     </div>
                   </CardHeader>
                   <CardContent>
                     <div className="mt-4 flex items-center justify-between">
                       <div className="flex gap-6 text-sm text-muted-foreground">
                         <span className="flex items-center"><FileText className="mr-2 h-4 w-4"/> {work.questionsCount} Questions</span>
                         <span className="flex items-center"><Users className="mr-2 h-4 w-4"/> {work.submissionsCount} Submissions</span>
                         <span className="flex items-center"><BarChart2 className="mr-2 h-4 w-4"/> Avg: {work.averageScore}%</span>
                       </div>
                       <Link href={`/dashboard/sessions/${sessionId}/work/${work.id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hover:bg-muted")}>
                           View Results <ArrowRight className="ml-2 h-4 w-4" />
                       </Link>
                     </div>
                   </CardContent>
                 </Card>
               ))
             )}
           </div>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Students</CardTitle>
              <CardDescription>Manage enrollment and view individual progress.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Reg No</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Average Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { name: "Baraka Juma", reg: "2021-04-0012", status: "Active", avg: "82%" },
                    { name: "Amina Hassan", reg: "2021-04-0045", status: "Active", avg: "94%" },
                    { name: "Juma Ali", reg: "2021-04-0022", status: "At Risk", avg: "38%" },
                    { name: "Sarah M.", reg: "2021-04-0099", status: "Active", avg: "76%" },
                    { name: "Daniel K.", reg: "2021-04-0102", status: "Active", avg: "88%" },
                  ].map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.reg}</TableCell>
                      <TableCell>
                         <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.status === 'At Risk' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                           {s.status}
                         </span>
                      </TableCell>
                      <TableCell className="text-right">{s.avg}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance Distribution</CardTitle>
                <CardDescription>Grade distribution across all works.</CardDescription>
              </CardHeader>
              <CardContent className="h-[200px] flex items-center justify-center bg-muted/20 rounded-lg">
                <BarChart2 className="h-12 w-12 text-muted-foreground/30" />
                <span className="ml-2 text-muted-foreground">Chart Placeholder</span>
              </CardContent>
            </Card>
             <Card>
              <CardHeader>
                <CardTitle>Difficulty Index</CardTitle>
                <CardDescription>Average difficulty per topic.</CardDescription>
              </CardHeader>
              <CardContent className="h-[200px] flex items-center justify-center bg-muted/20 rounded-lg">
                <BarChart2 className="h-12 w-12 text-muted-foreground/30" />
                <span className="ml-2 text-muted-foreground">Chart Placeholder</span>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
