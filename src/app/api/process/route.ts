import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { ScriptCollator, CollatedScript } from "@/lib/pdf/collation";
import { DeepSeekService } from "@/lib/ai/deepseek";
import { GeminiService } from "@/lib/ai/gemini";

// Set max duration for Vercel (5 minutes)
export const maxDuration = 300;

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { submissionId } = body;

    if (!submissionId) {
        return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id: parseInt(submissionId) },
      include: { quiz: true },
    });

    if (!submission || !submission.filePath) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const collator = new ScriptCollator();
    const deepseek = new DeepSeekService();
    const gemini = new GeminiService();

    let scripts: CollatedScript[] = [];
    if (submission.filePath.endsWith('.pdf')) {
        try {
            // This now splits the PDF into individual files per student
            scripts = await collator.collateScripts(submission.filePath);
        } catch (e) {
            console.warn("Collation failed:", e);
        }
    }

    let submissionsToProcess = [];

    if (scripts.length > 0) {
        // We found multiple students/scripts in the PDF
        for (const script of scripts) {
            const newSub = await prisma.submission.create({
                data: {
                    quizId: submission.quizId,
                    studentRegNo: script.studentId || "UNKNOWN",
                    studentName: "Extracted Student",
                    filePath: script.filePath, // Use the new split PDF path
                    status: "processing"
                },
                include: { quiz: true }
            });
            submissionsToProcess.push(newSub);
        }

        // Archive the parent batch file so it doesn't show up as a pending script
        await prisma.submission.update({
            where: { id: submission.id },
            data: { status: "archived", studentRegNo: "BATCH_PARENT" }
        });
    } else {
        // Single file upload or no split detected
        submissionsToProcess.push(submission);
    }

    let processedCount = 0;

    for (const sub of submissionsToProcess) {
        try {
            const mimeType = sub.filePath?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';

            // Full OCR of the dossier (now a single student's PDF)
            const ocrResult = await gemini.extractDataFromFile(sub.filePath!, mimeType);

            // Anti-Garbage Validation
            const validation = await deepseek.validateContent(ocrResult.text || "");

            if (validation && !validation.is_valid) {
                 await prisma.submission.update({
                    where: { id: sub.id },
                    data: { status: "flagged" }
                });
                await prisma.auditLog.create({
                    data: {
                        submissionId: sub.id,
                        action: "Flagged",
                        details: validation.reason
                    }
                });
                continue;
            }

            // Grade the Submission
            const rubric = sub.quiz.rubric || "Standard Rubric";
            const grading = await deepseek.gradeSubmission(ocrResult.text || "", rubric);

            // Save Score & Feedback
            await prisma.score.create({
                data: {
                    submissionId: sub.id,
                    totalMarks: grading.total_marks || 0,
                    breakdown: JSON.stringify(grading.breakdown || []),
                    remarks: grading.general_remarks,
                    confidence: grading.confidence_score
                }
            });

            // Generate Audit Log
            if (grading.audit_trail) {
                await prisma.auditLog.create({
                    data: {
                        submissionId: sub.id,
                        action: "Grading Audit",
                        details: grading.audit_trail
                    }
                });
            }

            // Update Status
            await prisma.submission.update({
                where: { id: sub.id },
                data: {
                    status: "graded",
                    studentRegNo: ocrResult.reg_no || sub.studentRegNo,
                    studentName: ocrResult.student_name || sub.studentName
                }
            });
            processedCount++;

        } catch (err: any) {
            console.error(`Error processing sub ${sub.id}:`, err);
            await prisma.submission.update({
                where: { id: sub.id },
                data: { status: "error" }
            });
        }
    }

    return NextResponse.json({ message: "Processing Complete", count: processedCount });

  } catch (e: any) {
    console.error("Processing Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
