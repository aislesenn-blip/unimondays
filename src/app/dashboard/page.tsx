import prisma from "@/lib/db/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus } from "lucide-react";

export default async function DashboardPage() {
  const { userId } = auth();

  if (!userId) {
    redirect("/login");
  }

  // Ensure user exists in db
  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: `${userId}@example.com`, // We will need Clerk webhook in production
      role: "LECTURER",
    },
  });

  const classes = await prisma.class.findMany({
    where: { lecturerId: userId },
    include: {
      _count: {
        select: { sessions: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Classes</h2>
          <p className="text-slate-500">Manage your courses and work sessions.</p>
        </div>
        <Link href="/dashboard/classes/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Class
          </Button>
        </Link>
      </div>

      {classes.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in-50">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <h3 className="mt-4 text-lg font-semibold">No classes created</h3>
            <p className="mb-4 mt-2 text-sm text-slate-500">
              You haven't created any classes yet. Create one to start managing
              work sessions and rubrics.
            </p>
            <Link href="/dashboard/classes/new">
              <Button size="sm" className="relative">
                Create Class
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <Link key={c.id} href={`/dashboard/classes/${c.id}`}>
              <Card className="hover:bg-slate-50 hover:shadow-sm transition-all shadow-none">
                <CardHeader>
                  <CardTitle>{c.name}</CardTitle>
                  <CardDescription>Code: {c.code}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-slate-500">
                    {c._count.sessions} Work Sessions
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
