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
    areGradesReleased: boolean | null;
    releaseMode: string | null;
    confidenceThreshold: number | null;
  };
}

export function WorkSessionControls({ session }: WorkSessionControlsProps) {
  const [strictDeadline, setStrictDeadline] = useState(session.strictDeadline || false);
  const [allowAppeals, setAllowAppeals] = useState(session.allowAppeals || false);
  const [areGradesReleased, setAreGradesReleased] = useState(session.areGradesReleased || false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(session.confidenceThreshold || 85);
  const [loading, setLoading] = useState<string | null>(null);

  const updateSetting = async (key: string, value: boolean | number) => {
    setLoading(key);
    try {
      const res = await fetch(`/api/work-sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error("Update failed");

      if (key === 'strictDeadline') setStrictDeadline(value as boolean);
      if (key === 'allowAppeals') setAllowAppeals(value as boolean);
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

        {/* AI Confidence Threshold */}
        <div className="flex items-center gap-3 border-l pl-6">
             <div className="flex flex-col gap-1">
                 <Label htmlFor="confidence" className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                    <ShieldAlert className="h-3 w-3" />
                    AI Flagging Threshold
                 </Label>
                 <div className="flex items-center gap-2">
                    <input
                        id="confidence"
                        type="number"
                        min="50" max="100"
                        value={confidenceThreshold}
                        onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
                        onBlur={(e) => updateSetting('confidenceThreshold', parseInt(e.target.value))}
                        className="w-14 h-8 text-sm border rounded px-2"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                 </div>
             </div>
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
