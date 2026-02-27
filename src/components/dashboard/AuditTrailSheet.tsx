"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, FileText, ChevronRight } from "lucide-react";
import { PlaybookAI } from "@/components/icons/PlaybookAI";

export function AuditTrailSheet({
  open,
  onOpenChange,
  studentName
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:w-[600px] max-w-[90vw] overflow-y-auto">
        <SheetHeader className="mb-6 border-b pb-4">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                {studentName.split(' ').map(n => n[0]).join('')}
             </div>
             <div>
               <SheetTitle>Marking Audit Trail</SheetTitle>
               <SheetDescription>Detailed breakdown for {studentName}</SheetDescription>
             </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* AI Confidence Card */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex items-center justify-between shadow-sm">
             <div className="flex items-center gap-3">
                <PlaybookAI className="h-5 w-5 text-emerald-600" />
                <div>
                  <h4 className="font-semibold text-emerald-900 text-sm">High Confidence Grade</h4>
                  <p className="text-xs text-emerald-700">AI is 98% confident in this assessment based on the rubric.</p>
                </div>
             </div>
             <Badge className="bg-emerald-600 hover:bg-emerald-700">98%</Badge>
          </div>

          {/* Question Breakdown */}
          <div className="space-y-4">
             <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
               <FileText className="h-4 w-4" /> Question Analysis
             </h3>

             {[1, 2].map((q) => (
               <div key={q} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                 <div className="bg-muted/30 px-4 py-2 border-b flex justify-between items-center">
                    <span className="font-medium text-sm">Question {q}</span>
                    <Badge variant="outline" className="text-xs h-5">10 / 10</Badge>
                 </div>
                 <div className="p-4 space-y-3">
                    <div className="bg-secondary/20 p-3 rounded-md text-sm italic text-muted-foreground border-l-2 border-primary/20">
                       "Object-Oriented Programming is a paradigm..."
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-sm">
                         <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                         <span className="text-foreground">Correctly identified encapsulation.</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                         <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                         <span className="text-foreground">Provided clear examples.</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-dashed mt-2">
                       <p className="text-xs font-medium text-primary flex items-center gap-1">
                          <PlaybookAI className="h-3 w-3" /> AI Justification:
                       </p>
                       <p className="text-xs text-muted-foreground mt-1">
                          Student demonstrated complete mastery of the core concepts defined in the marking scheme. No points deducted.
                       </p>
                    </div>
                 </div>
               </div>
             ))}
          </div>

          {/* Action Footer */}
          <div className="sticky bottom-0 bg-background pt-4 border-t flex gap-3">
             <Button className="flex-1" variant="outline">Flag for Review</Button>
             <Button className="flex-1">Confirm Grade</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
