"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Info, Lock, Eye, EyeOff, Scale, Clock } from "lucide-react";
import { useState } from "react";

export function ResultControlPanel() {
  const [releaseMode, setReleaseMode] = useState("manual");
  const [markingSchemeVisible, setMarkingSchemeVisible] = useState(false);
  const [resultsLocked, setResultsLocked] = useState(false);
  const [appealsEnabled, setAppealsEnabled] = useState(true);

  return (
    <Card className="border-l-4 border-l-primary shadow-sm">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            Result Control
            <TooltipProvider>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                Manage how and when students see their grades.
              </TooltipContent>
            </TooltipProvider>
          </CardTitle>
          <div className="flex items-center gap-2">
             <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider bg-background px-2 py-1 rounded border">
                {resultsLocked ? "LOCKED" : "EDITABLE"}
             </span>
          </div>
        </div>
        <CardDescription>
          Configure release settings, visibility, and appeal windows.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6 p-6 md:grid-cols-2 lg:grid-cols-4">

        {/* Release Mode */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold flex items-center gap-2">
            Release Mode
          </Label>
          <RadioGroup defaultValue="manual" onValueChange={setReleaseMode} className="gap-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="auto" id="r-auto" />
              <Label htmlFor="r-auto" className="font-normal cursor-pointer">Auto-release after grading</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="r-manual" />
              <Label htmlFor="r-manual" className="font-normal cursor-pointer">Hold for manual review</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="scheduled" id="r-scheduled" />
              <Label htmlFor="r-scheduled" className="font-normal cursor-pointer">Schedule Release</Label>
            </div>
          </RadioGroup>
          {releaseMode === "scheduled" && (
             <Input type="datetime-local" className="h-8 text-xs" />
          )}
        </div>

        {/* Visibility Controls */}
        <div className="space-y-4 border-l pl-6">
          <Label className="text-sm font-semibold">Visibility Settings</Label>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="scheme-visibility" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                {markingSchemeVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                Marking Scheme
              </Label>
              <p className="text-[10px] text-muted-foreground">Show rubric to students</p>
            </div>
            <Switch
              id="scheme-visibility"
              checked={markingSchemeVisible}
              onCheckedChange={setMarkingSchemeVisible}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="lock-results" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Lock className="h-3 w-3" />
                Lock Results
              </Label>
              <p className="text-[10px] text-muted-foreground">Prevent further edits</p>
            </div>
            <Switch
              id="lock-results"
              checked={resultsLocked}
              onCheckedChange={setResultsLocked}
            />
          </div>
        </div>

        {/* Appeal Settings */}
        <div className="space-y-4 border-l pl-6">
           <Label className="text-sm font-semibold flex items-center gap-2">
             <Scale className="h-3 w-3" />
             Appeal Window
           </Label>

           <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="appeals-enabled" className="text-sm font-medium cursor-pointer">Allow Appeals</Label>
            </div>
            <Switch
              id="appeals-enabled"
              checked={appealsEnabled}
              onCheckedChange={setAppealsEnabled}
            />
          </div>

          {appealsEnabled && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Open for (hours)
              </Label>
              <Input type="number" defaultValue={48} className="h-8 w-24" />
            </div>
          )}
        </div>

        {/* Status Preview */}
        <div className="bg-muted/30 rounded-lg p-4 flex flex-col justify-center space-y-2 text-xs border border-dashed">
           <div className="flex justify-between">
             <span className="text-muted-foreground">Status:</span>
             <span className="font-bold text-emerald-600">Active</span>
           </div>
           <div className="flex justify-between">
             <span className="text-muted-foreground">Released:</span>
             <span className="font-medium">0 / 142</span>
           </div>
           <div className="flex justify-between">
             <span className="text-muted-foreground">Appeals:</span>
             <span className="font-medium">{appealsEnabled ? "Open" : "Closed"}</span>
           </div>
        </div>

      </CardContent>
    </Card>
  );
}
