import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Users,
  FileText
} from "lucide-react";
import Link from "next/link";
import { SESSIONS } from "@/lib/mock-data";

export default function SessionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sessions</h2>
          <p className="text-muted-foreground">Manage your courses and academic terms.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Session
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search sessions..." className="pl-9 w-full" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {SESSIONS.map((session) => (
          <Link key={session.id} href={`/dashboard/sessions/${session.id}`} className="block h-full">
            <Card className="hover:shadow-md transition-all duration-200 cursor-pointer h-full border-l-4 border-l-transparent hover:border-l-primary">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-bold">{session.courseCode}</CardTitle>
                  <CardDescription className="line-clamp-1">{session.courseName}</CardDescription>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  session.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {session.status}
                </div>
              </CardHeader>
              <CardContent>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" />
                    {session.studentsCount} Students Enrolled
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <FileText className="mr-2 h-4 w-4" />
                    {session.worksCount} Works Created
                  </div>
                  <div className="pt-4 text-xs text-muted-foreground border-t border-dashed mt-4">
                    {session.semester}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
