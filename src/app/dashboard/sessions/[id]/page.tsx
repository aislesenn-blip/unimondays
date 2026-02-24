"use client";

import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SESSIONS, WORKS } from "@/lib/mock-data";
import { Plus, FileText, BarChart2, Users, Download, ArrowRight, BookOpen, Clock, Activity, Grip, ArrowLeft, PenTool, Upload, FileDigit, Settings } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { ContinuousAssessmentTable } from "@/components/dashboard/ContinuousAssessmentTable";
import { GroupManagement } from "@/components/dashboard/GroupManagement";

export default function SessionDetailsPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const session = SESSIONS.find(s => s.id === sessionId) || SESSIONS[0];
  const sessionWorks = WORKS.filter(w => w.sessionId === session.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/dashboard/sessions" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full border-b pb-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{session.courseCode}</h2>
            <p className="text-muted-foreground">{session.courseName} • {session.semester}</p>
          </div>
          <div className="flex items-center gap-2">
             <Button variant="outline" onClick={() => alert('Report exported successfully!')}>
               <Download className="mr-2 h-4 w-4" />
               Export Report
             </Button>
             <Button variant="destructive" onClick={() => alert('Session archiving feature coming soon')}>
               Archive Session
             </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="works" className="space-y-4">
        <div className="overflow-x-auto pb-2">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="works">Works</TabsTrigger>
            <TabsTrigger value="mark-exam" className="border-l border-r border-primary/20 bg-primary/5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
               <PenTool className="mr-2 h-3 w-3" /> Mark Exam
            </TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="groups">
              <Users className="mr-2 h-3 w-3" /> Groups
            </TabsTrigger>
            <TabsTrigger value="ca">
              <Activity className="mr-2 h-3 w-3" /> Continuous Assessment
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
        </div>

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

        <TabsContent value="mark-exam" className="space-y-6">
           <div className="flex justify-between items-center mb-6">
             <div>
               <h3 className="text-xl font-bold tracking-tight">Direct Exam Marking Workspace</h3>
               <p className="text-muted-foreground">Operational workflow for grading physical exams without full assignment setup.</p>
             </div>
             <Button>
               <Plus className="mr-2 h-4 w-4" /> Start New Marking Session
             </Button>
           </div>

           <div className="grid md:grid-cols-3 gap-6">
             {/* Step 1: Upload */}
             <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Upload className="h-5 w-5 text-blue-500" /> 1. Upload Scripts
                 </CardTitle>
                 <CardDescription>Drag & drop scanned PDF bundles.</CardDescription>
               </CardHeader>
               <CardContent className="h-40 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-blue-50/50">
                 <FileDigit className="h-10 w-10 text-blue-300 mb-2" />
                 <p className="text-sm text-muted-foreground font-medium">Drop files or click to browse</p>
               </CardContent>
             </Card>

             {/* Step 2: Calibration */}
             <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-all">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Settings className="h-5 w-5 text-purple-500" /> 2. Calibration
                 </CardTitle>
                 <CardDescription>Upload marking scheme & gold standards.</CardDescription>
               </CardHeader>
               <CardContent className="space-y-3">
                 <Button variant="outline" className="w-full justify-start" onClick={() => alert('Rubric upload modal')}>
                   <FileText className="mr-2 h-4 w-4" /> Upload Rubric
                 </Button>
                 <Button variant="outline" className="w-full justify-start" onClick={() => alert('Gold standards upload')}>
                   <Activity className="mr-2 h-4 w-4" /> Add Gold Standard Scripts (3)
                 </Button>
               </CardContent>
             </Card>

             {/* Step 3: Grading */}
             <Card className="border-l-4 border-l-emerald-500 hover:shadow-lg transition-all">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <PenTool className="h-5 w-5 text-emerald-500" /> 3. AI Grading
                 </CardTitle>
                 <CardDescription>Process scripts and verify results.</CardDescription>
               </CardHeader>
               <CardContent className="space-y-3">
                 <div className="flex items-center justify-between text-sm text-muted-foreground border p-2 rounded">
                   <span>Auto-Save to DB</span>
                   <Switch />
                 </div>
                 <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => alert('Starting AI grading process...')}>
                   Start Grading Process
                 </Button>
               </CardContent>
             </Card>
           </div>

           <div className="mt-8">
             <h4 className="font-semibold mb-4">Recent Marking Sessions</h4>
             <div className="rounded-md border">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Date</TableHead>
                     <TableHead>Batch Name</TableHead>
                     <TableHead>Scripts</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead className="text-right">Actions</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   <TableRow>
                     <TableCell>Today, 10:23 AM</TableCell>
                     <TableCell className="font-medium">Batch_A_MidTerms.pdf</TableCell>
                     <TableCell>45</TableCell>
                     <TableCell><span className="text-emerald-600 font-bold text-xs bg-emerald-100 px-2 py-1 rounded-full">COMPLETED</span></TableCell>
                     <TableCell className="text-right">
                       <Button variant="ghost" size="sm">Review</Button>
                     </TableCell>
                   </TableRow>
                   <TableRow>
                     <TableCell>Yesterday</TableCell>
                     <TableCell className="font-medium">Supplimentary_Exams.pdf</TableCell>
                     <TableCell>12</TableCell>
                     <TableCell><span className="text-blue-600 font-bold text-xs bg-blue-100 px-2 py-1 rounded-full">PROCESSING</span></TableCell>
                     <TableCell className="text-right">
                       <Button variant="ghost" size="sm" disabled>Review</Button>
                     </TableCell>
                   </TableRow>
                 </TableBody>
               </Table>
             </div>
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

        <TabsContent value="groups">
          <GroupManagement />
        </TabsContent>

        <TabsContent value="ca">
          <Card>
            <CardHeader>
              <div className="flex justify-between">
                <div>
                  <CardTitle>Continuous Assessment Tracker</CardTitle>
                  <CardDescription>Live overview of student progress across the semester.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => alert('Column reordering coming soon')}>
                    <Grip className="mr-2 h-4 w-4" /> Reorder Columns
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => alert('Exporting CSV...')}>Export CSV</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ContinuousAssessmentTable />
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
