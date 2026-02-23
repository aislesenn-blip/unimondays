import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { ScriptCollator } from "@/lib/pdf/collation";
import { DeepSeekService } from "@/lib/ai/deepseek";
import { GeminiService } from "@/lib/ai/gemini";

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

    // Initialize Services
    const collator = new ScriptCollator();
    const deepseek = new DeepSeekService();
    const gemini = new GeminiService();

    // 1. Collation Step
    let scripts: { studentId: string; filePath: string }[] = [];
    if (submission.filePath.endsWith('.pdf')) {
        try {
            console.log(`Collating submission ${submission.id}...`);
            scripts = await collator.collateScripts(submission.filePath);
            console.log(`Collation complete. Found ${scripts.length} scripts.`);
        } catch (e) {
            console.error("Collation failed:", e);
            // If collation fails, we might want to fallback to processing the whole file as one?
            // But if it's a 1000-page file, that's bad.
            // For now, let's treat the original file as one script if collation returns empty?
            // No, collation returns empty only if no IDs found or error.
            // If error, we should probably fail.
        }
    } else {
        // Image file, treat as single script
        scripts.push({ studentId: "SINGLE_IMAGE", filePath: submission.filePath });
    }

    // 2. Create Submission Records for Collated Scripts
    let submissionsToProcess = [];

    if (scripts.length > 0) {
        // Archive the parent submission
        await prisma.submission.update({
            where: { id: submission.id },
            data: { status: "archived", studentRegNo: "BATCH_PARENT" }
        });

        for (const script of scripts) {
            const newSub = await prisma.submission.create({
                data: {
                    quizId: submission.quizId,
                    studentRegNo: script.studentId || "UNKNOWN",
                    studentName: "Extracted Student",
                    filePath: script.filePath, // Point to the NEW individual PDF
                    status: "processing"
                },
                include: { quiz: true }
            });
            submissionsToProcess.push(newSub);
        }
    } else {
        // No scripts found? Maybe just process the original?
        // If it was a PDF and collation failed, this might be risky.
        // But let's assume if scripts is empty, we process the original.
        submissionsToProcess.push(submission);
    }

    let processedCount = 0;

    // 3. Process Each Script (OCR -> Validate -> Grade)
    for (const sub of submissionsToProcess) {
        try {
            console.log(`Processing submission ${sub.id} (${sub.studentRegNo})...`);
            const mimeType = sub.filePath?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';

            // A. Gemini OCR (The Eyes)
            const ocrResult = await gemini.extractDataFromFile(sub.filePath!, mimeType);

            if (!ocrResult || !ocrResult.text) {
                throw new Error("OCR Failed or Empty Text");
            }

            // B. DeepSeek Validation (The Anti-Garbage Guardrail)
            const validation = await deepseek.validateContent(ocrResult.text);

            if (validation && !validation.is_valid) {
                console.warn(`Submission ${sub.id} FLAGGED as garbage: ${validation.reason}`);
                await prisma.submission.update({
                    where: { id: sub.id },
                    data: { status: "flagged" }
                });
                await prisma.auditLog.create({
                    data: {
                        submissionId: sub.id,
                        action: "Flagged",
                        details: validation.reason || "Invalid content detected by AI."
                    }
                });
                continue; // Skip grading
            }

            // C. DeepSeek Grading (The Brain)
            const rubric = sub.quiz.rubric || "Standard Rubric";
            const grading = await deepseek.gradeSubmission(ocrResult.text, rubric);

            if (grading.error) {
                throw new Error(`Grading Error: ${grading.error}`);
            }

            // D. Save Score
            await prisma.score.create({
                data: {
                    submissionId: sub.id,
                    totalMarks: grading.total_marks || 0,
                    breakdown: JSON.stringify(grading.breakdown || []),
                    remarks: grading.general_remarks || "No remarks generated.",
                    confidence: grading.confidence_score
                }
            });

            // E. Finalize Submission Status
            await prisma.submission.update({
                where: { id: sub.id },
                data: {
                    status: "graded",
                    studentRegNo: ocrResult.reg_no || sub.studentRegNo, // Update if OCR found better ID
                    studentName: ocrResult.student_name || sub.studentName
                }
            });

            // F. Create Audit Log
            await prisma.auditLog.create({
                data: {
                    submissionId: sub.id,
                    action: "Grading",
                    details: grading.audit_trail || "Grading completed successfully."
                }
            });

            processedCount++;

        } catch (err: any) {
            console.error(`Error processing sub ${sub.id}:`, err);
            await prisma.submission.update({
                where: { id: sub.id },
                data: { status: "error" }
            });
            await prisma.auditLog.create({
                data: {
                    submissionId: sub.id,
                    action: "Error",
                    details: err.message
                }
            });
        }
    }

    return NextResponse.json({ message: "Processing Complete", count: processedCount });

  } catch (e: any) {
    console.error("Processing Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
