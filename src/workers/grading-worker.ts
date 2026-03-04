import { Job } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { readFile } from '@/lib/storage';
import { ocrDocument, extractPagesMultimodal, PageData } from '@/lib/ai/gemini';
import { detectAndChunkQuestions, QuestionChunk } from '@/lib/ai/chunker';
import { gradeSubmission, GradeConfig, GradingResult } from '@/lib/ai/deepseek';
import { simulateDeepSeekCall } from '@/lib/ai/simulator';
import pLimit from 'p-limit';

export async function handleAiGrade(job: Job) {
  let data: any;
  try {
     data = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
  } catch (e) {
     throw new Error("Invalid job payload JSON");
  }
  const { submissionId } = data;

  if (!submissionId) {
    throw new Error("Missing submissionId in job payload.");
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      workSession: {
        include: {
          lecturer: true,
          class: true
        }
      },
      user: true
    }
  });

  if (!submission) {
    throw new Error(`Submission ${submissionId} not found.`);
  }

  if (!submission.workSession) {
    throw new Error(`WorkSession not found for submission ${submissionId}.`);
  }

  console.log(`[GRADING_START] Submission ID: ${submissionId}, WorkSession: ${submission.workSession.title}`);

  try {
      // PARALLEL TASK 1: Submission Extraction & Chunking (Context Isolation)
      const submissionExtractionTask = async (): Promise<{ chunks: QuestionChunk[], rawText: string }> => {
          if (!submission.filePath) throw new Error("No file path for submission.");

          console.log(`[SUPABASE_FETCH] Submission File: ${submission.filePath}`);
          const buffer = await readFile(submission.filePath, 'exam_pdfs');

          // 1. Multimodal Page Extraction
          console.log(`[MULTIMODAL_START] Extracting pages from PDF buffer...`);
          const pages: PageData[] = await extractPagesMultimodal(buffer);

          // 2. Chunker Wiring
          console.log(`[CHUNKER_START] Isolating questions from ${pages.length} pages...`);
          const chunks = detectAndChunkQuestions(pages);
          console.log(`[CHUNKER_SUCCESS] Detected ${chunks.length} isolated question chunks.`);

          // We concatenate the raw text just to save to the ocrText DB field for debugging
          const rawText = pages.map(p => p.extractedText).join('\n\n--- PAGE BREAK ---\n\n');

          // Cache the extraction
          await prisma.submission.update({
              where: { id: submissionId },
              data: { ocrText: rawText, status: 'PROCESSING' }
          });

          return { chunks, rawText };
      };

      // PARALLEL TASK 2: Rubric OCR (with Caching)
      const rubricOcrTask = async (): Promise<string> => {
          if (submission.workSession.rubric) return submission.workSession.rubric;
          if (!submission.workSession.rubricUrl) return "Grade based on general academic standards and common sense.";

          try {
              console.log(`[SUPABASE_FETCH] Rubric File: ${submission.workSession.rubricUrl}`);
              const buffer = await readFile(submission.workSession.rubricUrl, 'exam_pdfs');
              const mimeType = submission.workSession.rubricUrl.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';

              console.log(`[OCR_START] Processing Rubric...`);
              const text = await ocrDocument(buffer, mimeType);
              console.log(`[OCR_SUCCESS] Rubric extracted: ${text.length} chars.`);

              if (text && text.length > 50) {
                  await prisma.workSession.update({
                      where: { id: submission.workSession.id },
                      data: { rubric: text }
                  }).catch(e => console.warn("[DB_WARN] Failed to cache rubric", e));
              }
              return text;
          } catch (e: any) {
              console.warn("[OCR_WARN] Rubric OCR failed, defaulting.", e.message);
              return "Grade based on general academic standards and common sense.";
          }
      };

      // PARALLEL TASK 3: Marking Scheme OCR
      const markingSchemeOcrTask = async (): Promise<string | undefined> => {
          const ms = submission.workSession.markingScheme;
          if (!ms) return undefined;

          // Check for URL-like paths (uploaded files) including 'rubrics/', 'bulk_uploads/', or pdf extensions
          if (ms.startsWith('rubrics/') || ms.startsWith('bulk_uploads/') || ms.includes('/') || ms.toLowerCase().endsWith('.pdf')) {
              try {
                  console.log(`[SUPABASE_FETCH] Marking Scheme: ${ms}`);
                  const buffer = await readFile(ms, 'exam_pdfs');
                  const mimeType = ms.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';
                  const text = await ocrDocument(buffer, mimeType);
                  return text;
              } catch (e: any) {
                  console.warn("[OCR_WARN] Marking Scheme OCR failed.", e.message);
                  return undefined;
              }
          }
          return ms;
      };

      // EXECUTE INITIAL PARALLEL TASKS
      let extractedData: { chunks: QuestionChunk[], rawText: string };
      let rubricContent: string;
      let markingSchemeText: string | undefined;

      try {
          [extractedData, rubricContent, markingSchemeText] = await Promise.all([
              submissionExtractionTask(),
              rubricOcrTask(),
              markingSchemeOcrTask()
          ]);
      } catch (e: any) {
          throw new Error(`Prerequisite Check Failed: ${e.message}`);
      }

      const { chunks, rawText } = extractedData;

      // Prepare Config
      const strictnessMap: Record<string, number> = {
        'LENIENT': 0.8, 'MODERATE': 1.0, 'STRICT': 1.2
      };
      const strictnessVal = strictnessMap[submission.workSession.strictness || 'MODERATE'] || 1.0;

      let calibrationSettings;
      try {
          calibrationSettings = submission.workSession.calibration ? JSON.parse(submission.workSession.calibration) : undefined;
      } catch (e) {}

      // Build Context String
      const lecturerName = submission.workSession.lecturer.fullName || "Lecturer";
      const className = submission.workSession.class ? `${submission.workSession.class.code} - ${submission.workSession.class.name}` : "Unknown Class";
      const studentId = submission.studentRegNo || submission.user?.fullName || "Student";
      const sessionTitle = submission.workSession.title;

      const contextString = `
You are grading on behalf of ${lecturerName}.
Course: ${className}.
Assessment: ${sessionTitle}.
Student Identifier: ${studentId}.
`;

      const config: GradeConfig = {
        strictness: strictnessVal,
        markingScheme: markingSchemeText,
        lecturerNotes: submission.workSession.instructions || undefined,
        calibration: calibrationSettings,
        context: contextString
      };

      // 3. FAULT-TOLERANT PARALLEL GRADING
      const totalMarks = submission.workSession.totalMarks || 100;
      console.log(`[AI_GRADE] Starting Parallel Grading for ${chunks.length} chunks. Limit: 5`);

      const limit = pLimit(5);
      const chunkPromises = chunks.map((chunk) => {
          return limit(async (): Promise<GradingResult['breakdown'][0] | null> => {
              if (chunk.questionId === "GLOBAL_METADATA" && chunk.combinedText.trim() === "") {
                  return null; // Skip empty metadata chunks
              }

              console.log(`[AI_CHUNK] Grading chunk: ${chunk.questionId}`);

              try {
                  // If we are using the simulator
                  if (!process.env.DEEPSEEK_API_KEY) {
                      const sim = await simulateDeepSeekCall(chunk.combinedText);
                      return {
                          question: chunk.questionId,
                          score: sim.score,
                          max: 10, // Mock max
                          feedback: sim.reasoning,
                          evidenceSnippet: "SIMULATED_SNIPPET",
                          rubricReference: "SIMULATED_REFERENCE"
                      };
                  }

                  // Note: gradeSubmission currently accepts a single image buffer.
                  // If chunks have multiple images, we'll pass the first one for now,
                  // or pass undefined if none exist.
                  const imageBuffer = chunk.associatedImagesBase64.length > 0
                      ? Buffer.from(chunk.associatedImagesBase64[0], 'base64')
                      : undefined;
                  const mimeType = imageBuffer ? "image/jpeg" : undefined;

                  const chunkResult = await gradeSubmission(
                      chunk.combinedText,
                      rubricContent,
                      totalMarks, // Will be overridden by the engine per question based on rubric
                      config,
                      imageBuffer,
                      mimeType
                  );

                  // DeepSeek returns a breakdown array, but since we fed it ONE chunk,
                  // it should return an array with 1 item. We extract that item.
                  const resultItem = chunkResult.breakdown && chunkResult.breakdown.length > 0
                    ? chunkResult.breakdown[0]
                    : {
                        question: chunk.questionId,
                        score: chunkResult.totalScore || 0,
                        max: 0,
                        feedback: chunkResult.aiReasoning || "No feedback generated.",
                        evidenceSnippet: "AI_SKIPPED",
                    };

                  // Enforce the question ID matches our chunk ID
                  resultItem.question = chunk.questionId;

                  return resultItem;

              } catch (chunkError: any) {
                  console.error(`[AI_CHUNK_ERROR] Failed to grade chunk ${chunk.questionId}:`, chunkError.message);

                  // FAULT TOLERANCE: Do not fail the whole Promise.all
                  return {
                      question: chunk.questionId,
                      score: 0,
                      max: 0, // Prevent messing up total max marks calculations if we track it later
                      feedback: `SYSTEM ERROR: Failed to grade this section due to an AI timeout or API error. (${chunkError.message})`,
                      evidenceSnippet: "GRADING_FAILED_API_ERROR"
                  };
              }
          });
      });

      // Aggregate Results
      const rawResults = await Promise.all(chunkPromises);
      const validBreakdowns = rawResults.filter(Boolean) as NonNullable<typeof rawResults[0]>[];

      let aggregatedScore = 0;
      validBreakdowns.forEach(item => {
          aggregatedScore += item.score;
      });

      // Since we chunked, the concept of "confidence" per exam is tricky.
      // We will default to a standard high confidence unless chunks failed.
      const hasFailures = validBreakdowns.some(item => item.evidenceSnippet === "GRADING_FAILED_API_ERROR");
      const aggregatedConfidence = hasFailures ? 50 : 95; // Rough average proxy for now

      const aggregatedReasoning = "Graded in parallel isolation. See specific question feedback.";
      const aggregatedIdentity = "UNKNOWN_IN_CHUNKS"; // If we need identity, we should parse the GLOBAL_METADATA chunk

      // 4. Save Score & Feedback
      const breakdownStr = JSON.stringify(validBreakdowns);

      await prisma.score.upsert({
        where: { submissionId: submission.id },
        update: {
          totalMarks: aggregatedScore,
          breakdown: breakdownStr,
          remarks: aggregatedReasoning,
          detectedIdentity: aggregatedIdentity,
          gradedAt: new Date()
        },
        create: {
          submissionId: submission.id,
          totalMarks: aggregatedScore,
          breakdown: breakdownStr,
          remarks: aggregatedReasoning,
          detectedIdentity: aggregatedIdentity
        }
      });

      // 5. Update Submission Status (Dynamic Confidence Threshold)
      let status: string;
      const threshold = submission.workSession.confidenceThreshold ?? 85;

      const isContextMissing = !submission.userId && !submission.studentRegNo;

      if (isContextMissing) {
          status = 'FLAGGED';
          console.warn(`[AI_IDENTITY] Unidentified GHOST submission. Flagging for manual review.`);
      } else {
          status = aggregatedConfidence >= threshold ? 'GRADED' : 'FLAGGED';
      }

      console.log(`[AI_CONFIDENCE] Score: ${aggregatedConfidence}, Threshold: ${threshold} -> Status: ${status} (Dynamic Threshold Applied)`);

      const feedbackStr = JSON.stringify({
        strengths: ["Parallel processing completed."],
        weaknesses: hasFailures ? ["Some sections failed to grade due to network errors."] : [],
        improvement: "Review chunk feedback for details."
      });

      await prisma.submission.update({
        where: { id: submission.id },
        data: {
          status,
          confidenceScore: aggregatedConfidence,
          feedback: feedbackStr
        }
      });

      // Create Audit Log
      await prisma.auditLog.create({
        data: {
          userId: submission.userId,
          action: status === 'GRADED' ? 'GRADED' : 'FLAGGED',
          details: `Submission for ${submission.workSession.title} ${status}. Score: ${aggregatedScore}`,
          severity: status === 'GRADED' ? 'INFO' : 'WARNING'
        }
      });

      if (submission.workSession.lecturerId) {
        await prisma.user.update({
            where: { id: submission.workSession.lecturerId },
            data: { used: { increment: 1 } }
        }).catch(e => console.warn(`[DB_WARN] Failed to increment quota`, e));
      }

      return {
        success: true,
        score: aggregatedScore,
        status
      };

  } catch (fatalError: any) {
      console.error(`[AI_FATAL_ERROR] Pipeline Crashed:`, fatalError);

      // RATE LIMIT ARMOR: Do not fail the submission if it's just a rate limit.
      // The queue processor will catch this and retry.
      if (fatalError.message?.includes("RATE_LIMIT_HIT")) {
          throw fatalError;
      }

      // CRITICAL: Update Status to FAILED so UI knows
      await prisma.submission.update({
          where: { id: submissionId },
          data: {
              status: 'FAILED',
              feedback: JSON.stringify({
                  error: `Grading Failed: ${fatalError.message}`,
                  details: fatalError.stack?.substring(0, 200)
              })
          }
      });

      throw fatalError;
  }
}
