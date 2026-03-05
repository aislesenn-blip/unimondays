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
    <Card className="mb-6 border-l-4 border-l-primary">
      <CardContent className="p-4 flex flex-wrap items-center gap-6">

        {/* Strict Deadline */}
        <div className="flex items-center space-x-2">
            <Switch
                id="strict-deadline"
                checked={strictDeadline}
                onCheckedChange={(v) => updateSetting('strictDeadline', v)}
                disabled={!!loading}
            />
            <Label htmlFor="strict-deadline" className="flex items-center gap-1 cursor-pointer">
                Strict Deadline
                {loading === 'strictDeadline' && <Loader2 className="h-3 w-3 animate-spin" />}
            </Label>
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
        </div>

        {/* Allow Appeals */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:space-x-4">
            <div className="flex items-center space-x-2">
                <Switch
                    id="allow-appeals"
                    checked={allowAppeals}
                    onCheckedChange={(v) => updateSetting('allowAppeals', v)}
                    disabled={!!loading}
                />
                <Label htmlFor="allow-appeals" className="flex items-center gap-1 cursor-pointer">
                    Allow Appeals
                    {loading === 'allowAppeals' && <Loader2 className="h-3 w-3 animate-spin" />}
                </Label>
            </div>
            {allowAppeals && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 w-full sm:w-auto">
                     <Label htmlFor="appeal-deadline" className="text-xs text-muted-foreground whitespace-nowrap">Until:</Label>
                     <input
                        type="datetime-local"
                        id="appeal-deadline"
                        value={appealDeadline}
                        onChange={(e) => updateSetting('appealDeadline', e.target.value)}
                        className="h-8 text-sm border rounded px-2 bg-background w-full sm:w-auto"
                     />
                </div>
            )}
        </div>

        {/* Manual Release Toggle */}
        {session.releaseMode === 'MANUAL' && (
             <div className="ml-auto flex items-center gap-4">
                 <div className="flex items-center gap-2">
                     <Badge variant={areGradesReleased ? "default" : "outline"} className={areGradesReleased ? "bg-green-600" : ""}>
                         {areGradesReleased ? "Grades Live" : "Grades Hidden"}
                     </Badge>
                 </div>
                 <Button
                    variant={areGradesReleased ? "outline" : "default"}
                    size="sm"
                    onClick={() => updateSetting('areGradesReleased', !areGradesReleased)}
                    disabled={!!loading}
                    className={!areGradesReleased ? "bg-primary animate-pulse" : ""}
                 >
                    {loading === 'areGradesReleased' ? <Loader2 className="h-4 w-4 animate-spin" /> :
                     areGradesReleased ? <Lock className="h-4 w-4 mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
                    {areGradesReleased ? "Unpublish Grades" : "Publish Grades Now"}
                 </Button>
             </div>
        )}
      </CardContent>
    </Card>
  );
}
