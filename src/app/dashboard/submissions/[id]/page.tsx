import prisma from "@/lib/db/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle } from "lucide-react";

export default async function GradedSubmissionPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = auth();
  if (!userId) redirect("/login");

  const submission = await prisma.submission.findUnique({
    where: { id: params.id },
    include: {
      score: true,
      workSession: {
        include: { class: true },
      },
      student: true,
    },
  });

  if (!submission || !submission.score) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Submission not found or still processing.</p>
      </div>
    );
  }

  const grades = (submission.score.breakdown as any).grades;

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
          <p className="text-slate-500">
            {submission.workSession.title} • {submission.student.email}
          </p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-extrabold text-slate-900">
            {submission.score.totalScore.toFixed(1)}
          </div>
          <div className="text-sm text-slate-500">Total Marks Awarded</div>
        </div>
      </div>

      <div className="space-y-8">
        {grades.map((grade: any, i: number) => (
          <div
            key={i}
            className={`p-6 rounded-xl border ${
              grade.review_suggested ? "border-amber-200 bg-amber-50/30" : "bg-white"
            } shadow-sm space-y-6 transition-all`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {grade.question_title}
                  {grade.review_suggested && (
                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Low Confidence
                    </Badge>
                  )}
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <Badge
                  variant="secondary"
                  className={`
                    ${grade.tier_applied.includes("1") ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}
                    ${grade.tier_applied.includes("2") ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}
                    ${grade.tier_applied.includes("3") ? "bg-amber-100 text-amber-700 hover:bg-amber-100" : ""}
                    ${grade.tier_applied.includes("4") ? "bg-red-100 text-red-700 hover:bg-red-100" : ""}
                  `}
                >
                  {grade.tier_applied}
                </Badge>
                <div className="text-xl font-bold font-mono">
                  {grade.score} <span className="text-slate-400 text-base font-normal">/ {grade.max_marks}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Evidence Snippet
              </span>
              <blockquote className="border-l-2 border-slate-200 pl-4 py-1 text-slate-600 italic text-sm">
                "{grade.evidence_snippet}"
              </blockquote>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 bg-slate-50 rounded-lg p-4">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                  <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
                  Student Feedback
                </span>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {grade.student_feedback}
                </p>
              </div>
              <div className="space-y-2 bg-slate-100 rounded-lg p-4 border border-slate-200/60">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Lecturer Justification
                </span>
                <p className="text-sm text-slate-600 font-mono">
                  {grade.lecturer_justification}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
