"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Lock, Unlock, AlertCircle, FileBarChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WorkSessionControlsProps {
  session: {
    id: string;
    strictDeadline: boolean;
    allowAppeals: boolean;
    areGradesReleased: boolean;
    releaseMode: string;
  };
}

export function WorkSessionControls({ session }: WorkSessionControlsProps) {
  const [strictDeadline, setStrictDeadline] = useState(session.strictDeadline);
  const [allowAppeals, setAllowAppeals] = useState(session.allowAppeals);
  const [areGradesReleased, setAreGradesReleased] = useState(session.areGradesReleased);
  const [loading, setLoading] = useState<string | null>(null);

  const updateSetting = async (key: string, value: boolean) => {
    setLoading(key);
    try {
      const res = await fetch(`/api/work-sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error("Update failed");

      if (key === 'strictDeadline') setStrictDeadline(value);
      if (key === 'allowAppeals') setAllowAppeals(value);
      if (key === 'areGradesReleased') setAreGradesReleased(value);

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
