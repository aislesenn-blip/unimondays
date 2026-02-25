import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  MoreVertical,
  Plus,
  ArrowLeft
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ContinuousAssessmentTable } from "@/components/dashboard/ContinuousAssessmentTable";
import { Button } from "@/components/ui/button"; // Added missing import
import { SessionStatusToggle } from "@/components/dashboard/SessionStatusToggle";

export default async function SessionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const sessionId = id;

  const session = await prisma.classes.findUnique({
    where: { id: sessionId },
    include: {
      _count: {
        select: { quizzes: true }
      }
    }
  });

  if (!session) return <div>Session not found</div>;

  // Verify access
  if (user.role.toUpperCase() === 'LECTURER' && session.lecturerId !== user.id) {
    return <div>Access Denied</div>;
  }

  if (user.role.toUpperCase() === 'STUDENT') {
    // Check if student has any submissions in this session to allow access?
    // Or just redirect to dashboard as student shouldn't be here (this is lecturer view)
    return redirect(`/student/dashboard`);
  }

  const works = await prisma.quiz.findMany({
    where: { classId: sessionId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { submissions: true } }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/sessions" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{session.code}</h2>
          <p className="text-muted-foreground">{session.name}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <SessionStatusToggle
            sessionId={session.id}
            initialStatus={session.status || "ACTIVE"}
          />
        </div>
      </div>

      <Tabs defaultValue="works" className="space-y-4">
        <TabsList>
          <TabsTrigger value="works">Assessments</TabsTrigger>
          <TabsTrigger value="students">Students & CA</TabsTrigger>
        </TabsList>

        <TabsContent value="works" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Assignments & Quizzes</h3>
            <Link href={`/dashboard/sessions/${session.id}/work/create`} className={cn(buttonVariants())}>
              <Plus className="h-4 w-4 mr-2" />
              Create Assessment
            </Link>
          </div>

          <div className="grid gap-4">
            {works.map((work) => (
              <Card key={work.id} className="hover:shadow-sm transition-all">
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/sessions/${session.id}/work/${work.id}`} className="hover:underline">
                          <CardTitle className="text-base">{work.title}</CardTitle>
                        </Link>
                        {work.status === "DRAFT" && <Badge variant="secondary">Draft</Badge>}
                        {work.status === "PUBLISHED" && <Badge className="bg-blue-500">Published</Badge>}
                        {work.status === "GRADING" && <Badge className="bg-yellow-500">Grading</Badge>}
                        {work.status === "RELEASED" && <Badge className="bg-green-500">Released</Badge>}
                      </div>
                      <CardDescription className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due: {work.deadline ? work.deadline.toLocaleDateString() : "No Deadline"}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {work._count.submissions} Submissions
                        </span>
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
              </Card>
            ))}
            {works.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                No assessments created yet.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="students">
           <ContinuousAssessmentTable sessionId={sessionId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
