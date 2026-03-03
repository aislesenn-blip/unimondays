'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { AlertCircle, ArrowRight, Loader2, Sparkles, Unlock, Lock, Users } from "lucide-react";
import { toast } from "sonner";
import { updateWorkSessionSettings, publishGrades, unpublishGrades } from "./actions";

export function WorkSessionControls({ session }: { session: any }) {
    const [isPending, startTransition] = useTransition();

    const handleSettingsUpdate = (formData: FormData) => {
        startTransition(async () => {
            const result = await updateWorkSessionSettings(session.id, formData);
            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.success("Settings updated successfully!");
            }
        });
    };

    const handlePublish = () => {
        if (!confirm("Are you sure you want to release all graded submissions to students? This action cannot be undone.")) return;
        startTransition(async () => {
            const result = await publishGrades(session.id);
            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.success(`${result.count} grades have been published!`);
            }
        });
    };
    
    const handleUnpublish = () => {
        if (!confirm("Are you sure you want to retract all published grades? Students will no longer be able to see their results.")) return;
        startTransition(async () => {
            const result = await unpublishGrades(session.id);
            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.warning(`${result.count} grades have been retracted.`)
            }
        });
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Column 1: Time & Exceptions */}
            <Card>
                <CardHeader>
                    <CardTitle>Time & Exceptions</CardTitle>
                    <CardDescription>Control submission deadlines and rules for appeals.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleSettingsUpdate} className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <Label htmlFor="strict-deadline" className="flex flex-col space-y-1">
                                <span>Strict Deadline</span>
                                <span className="font-normal leading-snug text-muted-foreground text-xs">
                                    Disallow any submissions after the deadline.
                                </span>
                            </Label>
                            <Switch id="strict-deadline" name="strictDeadline" defaultChecked={session.strictDeadline} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <Label htmlFor="allow-appeals" className="flex flex-col space-y-1">
                                <span>Allow Appeals</span>
                                <span className="font-normal leading-snug text-muted-foreground text-xs">
                                    Let students formally appeal their AI-generated grade.
                                </span>
                            </Label>
                            <Switch id="allow-appeals" name="allowAppeals" defaultChecked={session.allowAppeals} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="appeal-deadline">Appeal Deadline (Optional)</Label>
                            <Input 
                                id="appeal-deadline" 
                                name="appealDeadline" 
                                type="datetime-local" 
                                defaultValue={session.appealDeadline ? session.appealDeadline.slice(0, 16) : ''} 
                            />
                        </div>
                        <Button className="w-full" type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Time Controls
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Column 2: AI Autonomy */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Autonomy</CardTitle>
                    <CardDescription>Define how much trust to place in the automated grading engine.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleSettingsUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Review Threshold</Label>
                            <p className="text-xs text-muted-foreground pb-2">
                                Submissions with an AI Certainty score below this value will be suggested for a manual review.
                            </p>
                            <Slider 
                                name="confidenceThreshold"
                                defaultValue={[session.confidenceThreshold]}
                                max={100} 
                                step={5} 
                            />
                             <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Low Trust</span>
                                <span>High Trust</span>
                            </div>
                        </div>
                         <Button className="w-full" type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save AI Settings
                        </Button>

                         <Button variant="outline" className="w-full flex items-center justify-center gap-2 cursor-not-allowed" disabled>
                             <Users className="h-4 w-4 text-muted-foreground" />
                             <span className="text-muted-foreground/80">Smart Sample (Coming Q3)</span>
                         </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Column 3: Publishing */}
            <Card>
                <CardHeader>
                    <CardTitle>Publishing</CardTitle>
                    <CardDescription>Control when students can see their final grades and feedback.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {session.releaseMode !== 'MANUAL' && (
                        <Alert className="bg-blue-50 border-blue-200 text-blue-900">
                            <AlertCircle className="h-4 w-4 text-blue-600"/>
                            <AlertTitle className="text-blue-800 font-bold">Auto-Release Active</AlertTitle>
                            <AlertDescription className="text-xs mt-1">
                                Grades will be released automatically: <span className="font-semibold">{session.releaseMode === 'IMMEDIATE' ? 'Instantly' : 'On Deadline'}</span>
                            </AlertDescription>
                        </Alert>
                    )}
                    
                    {session.areGradesReleased ? (
                        <Button onClick={handleUnpublish} variant="destructive" className="w-full">
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                            Unpublish All Grades
                        </Button>
                    ) : (
                         <Button onClick={handlePublish} className="w-full">
                             {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlock className="mr-2 h-4 w-4" />}
                             Publish Grades Now
                         </Button>
                    )}
                     <p className="text-xs text-muted-foreground text-center px-4">
                        This will release all currently graded (but un-released) submissions to students.
                    </p>
                </CardContent>
            </Card>

        </div>
    );
}