import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, LayoutDashboard, Calendar, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";

const ASSIGNMENTS = [
  { id: 1, title: "Midterm Examination", date: "Oct 12, 2024", submissions: 42, graded: 42, status: "Completed" },
  { id: 2, title: "Assignment 1: Vectors", date: "Sep 25, 2024", submissions: 40, graded: 40, status: "Completed" },
  { id: 3, title: "Final Examination", date: "Dec 10, 2024", submissions: 0, graded: 0, status: "Draft" },
];

export default function ClassDetails() {
  return (
    <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">MATH-401</Badge>
            <span className="text-sm text-muted-foreground font-medium flex items-center gap-1">
              <Users className="h-4 w-4" /> 42 Enrolled
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Advanced Mathematics</h2>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-border/60 shadow-sm">
            <LayoutDashboard className="mr-2 h-4 w-4" /> View Analytics
          </Button>
          <Link href="/dashboard/assignments/create">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
              <Plus className="mr-2 h-4 w-4" /> New Assignment
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Class Average", value: "78.4%", desc: "+2.1% from last semester" },
          { label: "Highest Score", value: "98%", desc: "Student ID: 10442" },
          { label: "Total Assignments", value: "3", desc: "2 Completed, 1 Draft" },
          { label: "AI Accuracy", value: "99.2%", desc: "Based on teacher overrides" },
        ].map((stat, i) => (
          <Card key={i} className="border-border/50 bg-background/50 backdrop-blur-sm hover:border-border/80 transition-all">
            <CardContent className="p-6">
              <p className="luxury-subheading mb-1">{stat.label}</p>
              <p className="text-2xl font-bold tracking-tighter mb-1">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assignments List */}
      <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
          <div>
            <CardTitle>Assignments</CardTitle>
            <CardDescription>All assessments for this class.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/40">
            {ASSIGNMENTS.map((assignment) => (
              <div key={assignment.id} className="group flex items-center justify-between p-6 hover:bg-muted/30 transition-all cursor-pointer">
                <div className="flex items-center gap-5">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-inner ${assignment.status === 'Completed' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-lg">{assignment.title}</h4>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {assignment.date}</span>
                      <span>•</span>
                      <span>{assignment.graded} / {assignment.submissions} Graded</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={assignment.status === 'Completed' ? 'success' : 'outline'} className={assignment.status === 'Completed' ? '' : 'bg-background/50 backdrop-blur-md'}>
                    {assignment.status}
                  </Badge>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}