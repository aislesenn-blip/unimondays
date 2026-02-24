"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Loader2, BookOpen, Wifi, FileDigit, Layers } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function CreateSessionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sessionMode, setSessionMode] = useState("online");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      // Redirect to the newly created session (mock ID)
      router.push("/dashboard/sessions/sess_1");
    }, 1500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/sessions" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create New Session</h1>
          <p className="text-muted-foreground">Initialize a new academic course or semester grouping.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
            <CardDescription>Define the core metadata for this course.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="courseName">Course Name</Label>
              <Input id="courseName" placeholder="e.g. Introduction to Computer Science" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="courseCode">Course Code</Label>
                <Input id="courseCode" placeholder="e.g. CS 101" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="semester">Semester / Term</Label>
                <Input id="semester" placeholder="e.g. Semester 1 2024" required />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operating Mode</CardTitle>
            <CardDescription>Choose how you will primarily assess students in this session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup defaultValue="online" onValueChange={setSessionMode} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <RadioGroupItem value="online" id="mode-online" className="peer sr-only" />
                <Label
                  htmlFor="mode-online"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
                >
                  <Wifi className="mb-3 h-6 w-6" />
                  <div className="text-center">
                    <span className="font-semibold">Online</span>
                    <p className="text-xs text-muted-foreground mt-1">Digital quizzes & uploads.</p>
                  </div>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="offline" id="mode-offline" className="peer sr-only" />
                <Label
                  htmlFor="mode-offline"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
                >
                  <FileDigit className="mb-3 h-6 w-6" />
                  <div className="text-center">
                    <span className="font-semibold">Offline</span>
                    <p className="text-xs text-muted-foreground mt-1">Scan & grade physical scripts.</p>
                  </div>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="hybrid" id="mode-hybrid" className="peer sr-only" />
                <Label
                  htmlFor="mode-hybrid"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
                >
                  <Layers className="mb-3 h-6 w-6" />
                  <div className="text-center">
                    <span className="font-semibold">Hybrid</span>
                    <p className="text-xs text-muted-foreground mt-1">Mix of digital and physical.</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="ca-toggle" className="text-base">Enable Continuous Assessment</Label>
                <p className="text-sm text-muted-foreground">Track student progress across multiple works automatically.</p>
              </div>
              <Switch id="ca-toggle" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/dashboard/sessions" className={cn(buttonVariants({ variant: "outline" }))}>
            Cancel
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Session"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
