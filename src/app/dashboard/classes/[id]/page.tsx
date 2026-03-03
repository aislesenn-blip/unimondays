
import { createServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { CreateWorkSessionSheet } from "@/components/dashboard/CreateWorkSessionSheet";
import { CAOverview } from "@/components/dashboard/CAOverview";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Calendar, BarChart3, Table2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getClassDetails, getCAData } from "./actions";

export default async function ClassDetailsPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const classItem = await getClassDetails(params.id);

  if (!classItem) notFound();
  if (classItem.lecturerId !== user.id && !user.user_metadata.isAdmin) {
      redirect("/dashboard");
  }

  const caData = await getCAData(params.id);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">{classItem.code}</h1>
            <p className="text-muted-foreground mt-1">{classItem.name}</p>
        </div>
        <div className="flex gap-2">
            <Link prefetch={true} href={`/dashboard/classes/${params.id}/analytics`}>
                <Button variant="outline">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Analytics
                </Button>
            </Link>
            <Link prefetch={true} href={`/dashboard/classes/${params.id}/ca`}>
                <Button variant="outline">
                    <Table2 className="mr-2 h-4 w-4" />
                    Master CA
                </Button>
            </Link>
            <CreateWorkSessionSheet classId={params.id} />
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Main Content: Work Sessions */}
        <div className="md:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">Work Sessions</h2>
            </div>

            {classItem.workSessions.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="text-muted-foreground mb-4">No work sessions yet.</p>
                    <CreateWorkSessionSheet classId={params.id} />
                </div>
            ) : (
                <div className="grid gap-4">
                    {classItem.workSessions.map((session) => (
                        <Link prefetch={true} key={session.id} href={`/dashboard/work-sessions/${session.id}`}>
                            <Card className="hover:bg-accent/50 transition-all cursor-pointer border-l-4 border-l-blue-500 group">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-lg">{session.title}</h3>
                                            <Badge variant={session.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                                                {session.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <span className="font-mono bg-muted px-1 rounded text-foreground">
                                                    {session.workCode}
                                                </span>
                                            </span>
                                            {session.deadline && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(session.deadline).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right hidden sm:block">
                                            <div className="text-2xl font-bold">{session._count.submissions}</div>
                                            <div className="text-xs text-muted-foreground">Submissions</div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>

        {/* Sidebar: CA Overview */}
        <div className="md:col-span-1">
            <CAOverview data={caData} />
        </div>
      </div>
    </div>
  );
}
