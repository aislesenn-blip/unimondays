"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Lock, Unlock, AlertCircle, FileBarChart, ShieldAlert, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WorkSessionControlsProps {
  session: {
    id: string;
    strictDeadline: boolean | null;
    allowAppeals: boolean | null;
    appealDeadline: string | null;
    areGradesReleased: boolean | null;
    releaseMode: string | null;
    confidenceThreshold: number | null;
  };
}

export function WorkSessionControls({ session }: WorkSessionControlsProps) {
  const [strictDeadline, setStrictDeadline] = useState(session.strictDeadline || false);
  const [allowAppeals, setAllowAppeals] = useState(session.allowAppeals || false);
  const [appealDeadline, setAppealDeadline] = useState(session.appealDeadline ? new Date(session.appealDeadline).toISOString().slice(0, 16) : "");
  const [areGradesReleased, setAreGradesReleased] = useState(session.areGradesReleased || false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(session.confidenceThreshold || 85);
  const [loading, setLoading] = useState<string | null>(null);

  const updateSetting = async (key: string, value: boolean | number | string | null) => {
    setLoading(key);
    try {
      let payloadValue = value;
      // Convert date to ISO string (UTC) to handle timezones correctly
      if (key === 'appealDeadline' && typeof value === 'string' && value) {
          payloadValue = new Date(value).toISOString();
      }

      const res = await fetch(`/api/work-sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: payloadValue }),
      });
      if (!res.ok) throw new Error("Update failed");

      if (key === 'strictDeadline') setStrictDeadline(value as boolean);
      if (key === 'allowAppeals') setAllowAppeals(value as boolean);
      if (key === 'appealDeadline') setAppealDeadline(value as string);
      if (key === 'areGradesReleased') setAreGradesReleased(value as boolean);
      if (key === 'confidenceThreshold') setConfidenceThreshold(value as number);

      toast.success(`${key} updated`);
    } catch (error) {
      toast.error("Failed to update setting");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Time & Exceptions */}
      <Card className="border-l-4 border-l-blue-500 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">Time & Exceptions</h3>
          </div>

          <div className="space-y-4">
            {/* Strict Deadline */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Label htmlFor="strict-deadline" className="flex items-center gap-1 cursor-pointer text-sm">
                        Strict Deadline
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[200px]">
                                    <p className="text-xs">If enabled, submissions are blocked after the deadline. If disabled, they are marked as 'Late'.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        {loading === 'strictDeadline' && <Loader2 className="h-3 w-3 animate-spin" />}
                    </Label>
                </div>
                <Switch
                    id="strict-deadline"
                    checked={strictDeadline}
                    onCheckedChange={(v) => updateSetting('strictDeadline', v)}
                    disabled={!!loading}
                />
            </div>

            {/* Allow Appeals */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="allow-appeals" className="flex items-center gap-1 cursor-pointer text-sm">
                        Allow Appeals
                        {loading === 'allowAppeals' && <Loader2 className="h-3 w-3 animate-spin" />}
                    </Label>
                    <Switch
                        id="allow-appeals"
                        checked={allowAppeals}
                        onCheckedChange={(v) => updateSetting('allowAppeals', v)}
                        disabled={!!loading}
                    />
                </div>
                {allowAppeals && (
                    <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-top-1 w-full bg-muted/30 p-2 rounded-md">
                         <Label htmlFor="appeal-deadline" className="text-xs text-muted-foreground">Deadline (Until):</Label>
                         <input
                            type="datetime-local"
                            id="appeal-deadline"
                            value={appealDeadline}
                            onChange={(e) => updateSetting('appealDeadline', e.target.value)}
                            className="h-8 text-sm border rounded px-2 bg-background w-full"
                         />
                    </div>
                )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Autonomy */}
      <Card className="border-l-4 border-l-indigo-500 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">AI Autonomy</h3>
          </div>

          <div className="space-y-2">
              <Label htmlFor="confidence" className="text-sm flex items-center gap-1.5">
                 <ShieldAlert className="h-4 w-4 text-indigo-500" />
                 Flagging Threshold
              </Label>
              <div className="flex items-center gap-2">
                 <input
                     id="confidence"
                     type="number"
                     min="50" max="100"
                     value={confidenceThreshold}
                     onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
                     onBlur={(e) => updateSetting('confidenceThreshold', parseInt(e.target.value))}
                     className="w-16 h-9 text-sm border rounded px-3 text-center"
                 />
                 <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                  Submissions with AI confidence below this value will be flagged for manual review.
              </p>
          </div>
        </CardContent>
      </Card>

      {/* Publishing */}
      <Card className="border-l-4 border-l-emerald-500 shadow-sm flex flex-col">
        <CardContent className="p-4 flex flex-col h-full space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">Publishing</h3>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center space-y-4">
            {session.releaseMode === 'MANUAL' ? (
                <>
                    <Badge variant={areGradesReleased ? "default" : "outline"} className={`px-4 py-1 text-sm ${areGradesReleased ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}>
                        {areGradesReleased ? "Grades Live" : "Grades Hidden"}
                    </Badge>
                    <Button
                        variant={areGradesReleased ? "outline" : "default"}
                        size="sm"
                        onClick={() => updateSetting('areGradesReleased', !areGradesReleased)}
                        disabled={!!loading}
                        className={`w-full ${!areGradesReleased ? "bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse shadow-md" : ""}`}
                    >
                        {loading === 'areGradesReleased' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> :
                         areGradesReleased ? <Lock className="h-4 w-4 mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
                        {areGradesReleased ? "Unpublish Grades" : "Publish Grades Now"}
                    </Button>
                </>
            ) : (
                <div className="text-center space-y-2 py-4">
                    <FileBarChart className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                    <p className="text-sm text-muted-foreground font-medium">Automatic Release</p>
                    <p className="text-xs text-muted-foreground">Grades are managed by system configuration ({session.releaseMode}).</p>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
