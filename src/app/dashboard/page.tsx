import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Users, BookOpen, ChevronRight, Activity } from "lucide-react";

const STATS = [
  { label: "Active Classes", value: "4", icon: Users, color: "text-blue-500" },
  { label: "Pending Grading", value: "128", icon: Activity, color: "text-amber-500" },
  { label: "AI Processed", value: "3,402", icon: Sparkles, color: "text-purple-500" },
];

const RECENT_CLASSES = [
  { id: 1, name: "Advanced Mathematics", code: "MATH-401", students: 42, status: "Active" },
  { id: 2, name: "Intro to Physics", code: "PHYS-101", students: 120, status: "Active" },
  { id: 3, name: "Computer Science II", code: "CS-202", students: 85, status: "Active" },
];

export default function DashboardOverview() {
  return (
    <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back, Sarah.</h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">You have 128 submissions waiting for AI evaluation.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-border/60">View Reports</Button>
          <Button className="bg-foreground text-background hover:bg-foreground/90 shadow-lg shadow-black/10">
            <Sparkles className="mr-2 h-4 w-4" /> Start AI Grading
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STATS.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-background/50 backdrop-blur-sm hover:border-border/80 transition-all">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="luxury-subheading mb-1">{stat.label}</p>
                <p className="text-3xl font-bold tracking-tighter">{stat.value}</p>
              </div>
              <div className={`h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center border border-border/40 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Classes List */}
        <Card className="lg:col-span-2 border-border/50 bg-background/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Active Classes</CardTitle>
              <CardDescription>Your current semester overview.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground">View All</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-4">
              {RECENT_CLASSES.map((cls) => (
                <div key={cls.id} className="group flex items-center justify-between p-4 rounded-2xl border border-border/40 hover:border-border/80 hover:bg-muted/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shadow-inner">
                      {cls.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{cls.name}</p>
                      <p className="text-xs text-muted-foreground font-medium">{cls.code} • {cls.students} Students</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-background/50 backdrop-blur-md">{cls.status}</Badge>
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Recent Activity */}
        <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>AI Assistant</CardTitle>
            <CardDescription>Playbook insights & tasks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-500/20 shadow-inner">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-indigo-500 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Rubric Optimization</p>
                  <p className="text-xs text-muted-foreground mb-3">I noticed your MATH-401 rubric could use more granular tiers for partial credit. Would you like me to restructure it?</p>
                  <Button size="sm" variant="secondary" className="w-full text-xs">Optimize Rubric</Button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="luxury-subheading">Recent Activity</h4>
              <div className="flex gap-3 items-center text-sm">
                 <div className="w-2 h-2 rounded-full bg-success" />
                 <span className="text-muted-foreground">Graded 42 scripts for <strong className="text-foreground font-medium">CS-202</strong></span>
              </div>
              <div className="flex gap-3 items-center text-sm">
                 <div className="w-2 h-2 rounded-full bg-amber-500" />
                 <span className="text-muted-foreground">Flagged 3 scripts for review in <strong className="text-foreground font-medium">PHYS-101</strong></span>
              </div>
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}