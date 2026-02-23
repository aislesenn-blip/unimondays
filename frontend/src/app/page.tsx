import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 animate-in">
      <div className="absolute inset-0 -z-10 h-full w-full bg-white [background:radial-gradient(125%_125%_at_50%_10%,#fff_40%,#63e_100%)] dark:bg-slate-950 dark:[background:radial-gradient(125%_125%_at_50%_10%,#000_40%,#63e_100%)] opacity-20" />

      <div className="text-center mb-8 space-y-2">
        <h1 className="text-4xl font-light tracking-tight lg:text-5xl">
          PLAYBOOK
        </h1>
        <p className="text-muted-foreground tracking-widest uppercase text-xs">
          Global Assessment Infrastructure
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 w-full max-w-md">
        <Card className="glass hover:scale-[1.02] transition-transform cursor-pointer">
          <CardHeader>
            <CardTitle>Lecturer Access</CardTitle>
            <CardDescription>Manage quizzes, grade scripts, and view analytics.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button className="w-full" variant="default">Enter Playbook</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="glass hover:scale-[1.02] transition-transform cursor-pointer">
          <CardHeader>
            <CardTitle>Student Account</CardTitle>
            <CardDescription>Enter quiz code, take assessments, view results.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/quiz">
              <Button className="w-full" variant="secondary">Enter Code</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
