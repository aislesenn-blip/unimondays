"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export interface ScoreItem {
  question_id: string;
  question_title: string;
  score: number;
  max_marks: number;
  tier_applied: "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4";
  evidence_snippet: string;
  student_feedback: string;
  lecturer_justification: string;
  review_suggested: boolean;
}

interface AuditTrailProps {
  scoreItems: ScoreItem[];
  totalScore: number;
  maxScore: number;
}

export function AuditTrail({ scoreItems, totalScore, maxScore }: AuditTrailProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Tier 1": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Tier 2": return "bg-blue-50 text-blue-700 border-blue-200";
      case "Tier 3": return "bg-amber-50 text-amber-700 border-amber-200";
      case "Tier 4": return "bg-slate-100 text-slate-500 border-slate-200";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Overview Header */}
      <div className="flex items-end justify-between border-b border-slate-200 pb-6 mb-8">
        <div>
          <h2 className="text-3xl font-light text-slate-900 tracking-tight">Audit Trail</h2>
          <p className="text-slate-500 font-light mt-1 text-sm">Granular breakdown and exact mapping.</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-light text-slate-900 tracking-tight">
            {totalScore}<span className="text-slate-400 text-2xl font-light">/{maxScore}</span>
          </div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-1">Final Score</div>
        </div>
      </div>

      {/* Breakdown List */}
      <div className="space-y-4">
        {scoreItems.map((item, idx) => {
          const isExpanded = expandedItems[item.question_id] || false;

          return (
            <div
              key={item.question_id}
              className={cn(
                "rounded-2xl border transition-all duration-300 overflow-hidden bg-white",
                item.review_suggested ? "border-amber-200 shadow-sm shadow-amber-100" : "border-slate-200 hover:border-slate-300"
              )}
            >
              {/* Card Header (Clickable) */}
              <button
                onClick={() => toggleItem(item.question_id)}
                className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center h-12 w-12 rounded-full bg-slate-50 border border-slate-100 shrink-0">
                    <span className="text-sm font-medium text-slate-900">Q{idx + 1}</span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-medium text-slate-900 flex items-center gap-2">
                      {item.question_title}
                      {item.review_suggested && (
                        <span className="inline-flex items-center text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                           <AlertTriangle className="h-3 w-3 mr-1" strokeWidth={2.5}/> Flagged
                        </span>
                      )}
                    </h3>

                    <div className="flex items-center gap-3">
                      <div className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", getTierColor(item.tier_applied))}>
                        {item.tier_applied}
                      </div>
                      <span className="text-xs text-slate-400">
                        {item.score === item.max_marks ? "Full Match" : item.score > 0 ? "Partial Match" : "No Match"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xl font-medium text-slate-900">{item.score}<span className="text-sm text-slate-400 font-light">/{item.max_marks}</span></div>
                  </div>
                  <ChevronDown className={cn("h-5 w-5 text-slate-400 transition-transform duration-300", isExpanded && "rotate-180")} strokeWidth={1.5} />
                </div>
              </button>

              {/* Expandable Body */}
              <div
                className={cn(
                  "grid transition-all duration-300 ease-in-out",
                  isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="overflow-hidden">
                  <div className="px-5 pb-6 pt-2 space-y-6">
                    {/* The Evidence */}
                    <div className="space-y-2">
                       <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                         <Info className="h-3.5 w-3.5" /> Verbatim Evidence Snippet
                       </h4>
                       <blockquote className="border-l-2 border-slate-300 pl-4 py-1 italic text-slate-700 text-sm font-light bg-slate-50/50 rounded-r-lg">
                         "{item.evidence_snippet}"
                       </blockquote>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Teacher View */}
                      <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
                         <h4 className="text-xs font-medium text-slate-900 uppercase tracking-wider">Lecturer Justification</h4>
                         <p className="text-sm font-light text-slate-600 leading-relaxed">
                           {item.lecturer_justification}
                         </p>
                      </div>

                      {/* Student View */}
                      <div className="space-y-2 p-4 rounded-xl border border-slate-100">
                         <h4 className="text-xs font-medium text-slate-900 uppercase tracking-wider">Student Feedback</h4>
                         <p className="text-sm font-light text-slate-600 leading-relaxed">
                           {item.student_feedback}
                         </p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
