import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CreateClassSheet } from "@/components/dashboard/CreateClassSheet";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, Folder } from "lucide-react";

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
      redirect("/login");
  }

  const classes = await prisma.classes.findMany({
    where: { lecturerId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { workSessions: true }
      }
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">My Classes</h1>
            <p className="text-muted-foreground mt-1">Manage your cohorts and assignments.</p>
        </div>
        <CreateClassSheet />
      </div>

      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center bg-card/50">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Folder className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No classes created</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
                Get started by creating your first class to organize work sessions and students.
            </p>
            <CreateClassSheet />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
                <Link key={cls.id} href={`/dashboard/classes/${cls.id}`} prefetch={true}>
                    <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full border-l-4 border-l-primary group">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-xl">{cls.code}</CardTitle>
                            </div>
                            <CardDescription className="line-clamp-1 text-base">{cls.name}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between text-sm text-muted-foreground pt-4 border-t group-hover:border-primary/20 transition-colors">
                                <span>{cls.semester || 'No Semester'}</span>
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                    <Folder className="h-4 w-4" />
                                    {cls._count.workSessions} Sessions
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
      )}
    </div>
  );
}
