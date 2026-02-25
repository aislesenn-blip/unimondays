import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, Calendar, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SessionsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const sessions = await prisma.classes.findMany({
    where: { lecturerId: user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          enrollments: true,
          quizzes: true,
        }
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Academic Sessions</h2>
          <p className="text-muted-foreground">
            Manage your classes, students, and assessments.
          </p>
        </div>
        <Link href="/dashboard/sessions/create" className={cn(buttonVariants())}>
          Create New Session
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
          <Card key={session.id} className="hover:shadow-md transition-all">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl mb-1">{session.code}</CardTitle>
                  <CardDescription className="line-clamp-1">{session.name}</CardDescription>
                </div>
                <Badge variant={session.status === "ACTIVE" ? "default" : "secondary"}>
                  {session.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {session._count.enrollments} Students
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {session._count.quizzes} Works
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Created {session.createdAt.toLocaleDateString()}
              </div>
            </CardContent>
            <CardFooter className="pt-4 border-t flex justify-between">
              <Link
                href={`/dashboard/sessions/${session.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
              >
                Manage Session
              </Link>
            </CardFooter>
          </Card>
        ))}

        {sessions.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg bg-muted/50">
            <BookOpen className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No sessions found</h3>
            <p className="text-sm text-muted-foreground mb-4">Get started by creating your first academic session.</p>
            <Link href="/dashboard/sessions/create" className={cn(buttonVariants())}>
              Create Session
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
