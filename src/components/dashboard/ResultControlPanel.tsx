"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Info, Lock, Eye, EyeOff, Scale, Clock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Select } from "@/components/ui/select";
import { useRouter } from "next/navigation";

interface ResultControlPanelProps {
  workId: string;
  initialStatus: string; // DRAFT, PUBLISHED, GRADING, RELEASED
  initialStrictness: string; // LENIENT, MODERATE, STRICT
}

export function ResultControlPanel({ workId, initialStatus, initialStrictness }: ResultControlPanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [strictness, setStrictness] = useState(initialStrictness || "MODERATE");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (field: string, value: string) => {
    setLoading(true);
    try {
      const payload = { [field]: value };
      const res = await fetch(`/api/assessments/${workId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Update failed");

      const data = await res.json();
      if (field === 'status') setStatus(data.status);
      if (field === 'strictness') setStrictness(data.strictness);

      router.refresh();
    } catch (error) {
      console.error("Failed to update assessment", error);
    } finally {
      setLoading(false);
    }
  };

  const isReleased = status === "RELEASED";

  return (
    <Card className="border-l-4 border-l-primary shadow-sm">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            Result Control & Calibration
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardTitle>
          <div className="flex items-center gap-2">
             <span className={`text-xs font-medium uppercase tracking-wider px-2 py-1 rounded border ${isReleased ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}`}>
                {isReleased ? "LIVE / VISIBLE" : "HIDDEN / GRADING"}
             </span>
          </div>
        </div>
        <CardDescription>
          Control student visibility and adjust AI grading parameters.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">

        {/* Release Control */}
        <div className="space-y-4">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4" /> Visibility Status
          </Label>
          <div className="flex flex-col gap-3">
             <div className="flex items-center space-x-2">
                <Switch
                  id="release-mode"
                  checked={isReleased}
                  onCheckedChange={(checked) => handleUpdate('status', checked ? 'RELEASED' : 'GRADING')}
                  disabled={loading}
                />
                <Label htmlFor="release-mode" className="cursor-pointer">
                  {isReleased ? "Results Released to Students" : "Hold Results (Grading Mode)"}
                </Label>
             </div>
             <p className="text-xs text-muted-foreground">
               {isReleased
                 ? "Students can view their grades and feedback immediately."
                 : "Grades are hidden. Use this mode while verifying AI results."}
             </p>
          </div>
        </div>

        {/* Calibration / Strictness */}
        <div className="space-y-4 border-l pl-6">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Scale className="h-4 w-4" /> Grading Strictness
          </Label>
          <div className="space-y-2">
            <Select
              value={strictness}
              onChange={(e) => handleUpdate('strictness', e.target.value)}
              disabled={loading}
            >
              <option value="LENIENT">Lenient (Partial Marks)</option>
              <option value="MODERATE">Moderate (Standard)</option>
              <option value="STRICT">Strict (Exact Match)</option>
            </Select>
            <p className="text-xs text-muted-foreground">
              Adjusts the AI prompt's tolerance for partial answers.
              Changes apply to <strong>future grading jobs</strong> only.
            </p>
          </div>
        </div>

        {/* Status Preview / Stats */}
        <div className="bg-muted/30 rounded-lg p-4 flex flex-col justify-center space-y-2 text-xs border border-dashed">
           <div className="flex justify-between items-center">
             <span className="text-muted-foreground">AI Configuration:</span>
             <span className="font-mono bg-background px-1 rounded border">{strictness}</span>
           </div>
           <div className="flex justify-between items-center">
             <span className="text-muted-foreground">Student Access:</span>
             <span className={isReleased ? "text-emerald-600 font-bold" : "text-yellow-600 font-bold"}>
               {isReleased ? "Granted" : "Revoked"}
             </span>
           </div>
        </div>

      </CardContent>
    </Card>
  );
}
