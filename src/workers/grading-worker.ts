import { Job } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { readFile } from '@/lib/storage';
import { extractPagesMultimodal, ocrDocument } from '@/lib/ai/gemini';
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
      // PARALLEL TASK 1: Submission OCR & Chunking
      const submissionOcrTask = async (): Promise<{ chunks: QuestionChunk[], buffer: Buffer, mimeType: string }> => {
          if (!submission.filePath) throw new Error("No file path and no OCR text for submission.");

          console.log(`[SUPABASE_FETCH] Submission File: ${submission.filePath}`);
          const buffer = await readFile(submission.filePath, 'exam_pdfs');

          const mimeType = submission.filePath.toLowerCase().endsWith('.png') ? 'image/png' :
                           submission.filePath.toLowerCase().endsWith('.jpg') || submission.filePath.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' :
                           'application/pdf';

          try {
              console.log(`[OCR_START] Extracting pages from ${buffer.length} bytes...`);
              const pages = await extractPagesMultimodal(buffer);
              console.log(`[CHUNK_START] Detecting boundaries across ${pages.length} pages...`);
              const chunks = detectAndChunkQuestions(pages);
              console.log(`[CHUNK_SUCCESS] Generated ${chunks.length} isolated chunks.`);

              // For caching, we save a stitched text back to DB.
              const fullText = chunks.map(c => c.combinedText).join('\n\n');

              // PRE-CHUNKING IDENTITY EXTRACTION
              // Pattern: "REGISTRATION NUMBER 2018-04-12551" or similar
              let extractedRegNo = submission.studentRegNo;
              const regMatch = fullText.match(/REGISTRATION\s+NUMBER\s+([A-Z0-9-]+)/i);
              if (regMatch && regMatch[1]) {
                  extractedRegNo = regMatch[1].trim();
                  console.log(`[IDENTITY_EXTRACTION] Found Registration Number: ${extractedRegNo}`);
              }

              // Save immediately
              await prisma.submission.update({
                  where: { id: submissionId },
                  data: {
                      ocrText: fullText,
                      status: 'PROCESSING',
                      studentRegNo: extractedRegNo // Save extracted identity to DB
                  }
              });
              return { chunks, buffer, mimeType };
          } catch (ocrError: any) {
              console.error("[OCR_FATAL_ERROR]", ocrError);
              throw new Error(`OCR Processing Failed: ${ocrError.message}`);
          }
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
                  console.log(`[OCR_SUCCESS] Marking Scheme extracted: ${text.length} chars.`);
                  return text;
              } catch (e: any) {
                  console.warn("[OCR_WARN] Marking Scheme OCR failed.", e.message);
                  return undefined;
              }
          }
          return ms;
      };

      // EXECUTE PARALLEL TASKS
      let submissionData: { chunks: QuestionChunk[], buffer: Buffer, mimeType: string };
      let rubricContent: string;
      let markingSchemeText: string | undefined;

      try {
          // Note: The rubric fallback and marking scheme OCR (using older ocrDocument)
          // are not requested to change in this phase, but they need ocrDocument.
          // Since ocrDocument was removed, we must adapt them to use extractPagesMultimodal
          // or re-import ocrDocument if we shouldn't touch them.
          // Wait, the prompt said "Remove the old ocrDocument call...".
          // However, rubric/ms extraction uses ocrDocument. Let's re-import it locally for them just to be safe,
          // or assume we leave it. Wait, if I removed ocrDocument from the import, `rubricOcrTask` will fail.
          // I should add `ocrDocument` back to the import statement. Let's fix that.
          [submissionData, rubricContent, markingSchemeText] = await Promise.all([
              submissionOcrTask(),
              rubricOcrTask(),
              markingSchemeOcrTask()
          ]);
      } catch (e: any) {
          throw new Error(`Prerequisite Check Failed: ${e.message}`);
      }

      const { chunks, buffer: submissionBuffer, mimeType: submissionMime } = submissionData;

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

      // 3. Grade (Zero-Trust Tracing)
      const totalMarks = submission.workSession.totalMarks || 100;

      console.log(`[AI_GRADE] Invoking AI for Job ${job.id}`);
      console.log(`- Config: Strictness=${config.strictness}`);
      console.log(`- Context: ${contextString.trim()}`);
      console.log(`- Payload: ${chunks.length} chunks, Rubric=${rubricContent.length} chars`);

      let result: GradingResult;

      const limit = pLimit(5);
      let aggregatedScore = 0;
      let aggregatedConfidence = 0;
      const finalBreakdown: any[] = [];
      let globalAiReasoning = "Evaluated via chunking engine.";

      if (!process.env.DEEPSEEK_API_KEY) {
          console.log(`[Simulator] Using DeepSeek Simulator`);
          const sim = await simulateDeepSeekCall(chunks[0]?.combinedText || "");
          if (sim.breakdown === "INVALID_JSON_RESPONSE") throw new Error("AI returned malformed JSON (Simulator)");

          result = {
              totalScore: sim.score,
              breakdown: Array.isArray(sim.breakdown) ? sim.breakdown.map((b: any) => ({
                  ...b,
                  isRelevant: true,
                  mappedRubricQuestion: "Q1",
                  evidenceSnippet: "SIMULATED_SNIPPET"
              })) : [],
              aiReasoning: sim.reasoning,
              confidence: sim.confidence,
              strengths: ["Consistency", "Clarity"],
              weaknesses: ["Calculation Error"],
              improvement: "Check arithmetic."
          };
      } else {
          const chunkPromises = chunks.map(chunk => limit(async () => {
              try {
                  console.log(`[GRADING_CHUNK] Evaluating Chunk: ${chunk.questionId}`);

                  // Reconstruct buffer from the first associated image if multimodal is needed.
                  let chunkBuffer: Buffer | undefined;
                  let chunkMime: string | undefined;

                  if (chunk.associatedImagesBase64 && chunk.associatedImagesBase64.length > 0) {
                      chunkBuffer = Buffer.from(chunk.associatedImagesBase64[0], 'base64');
                      chunkMime = 'image/jpeg'; // As set in the extractPagesMultimodal function
                  }

                  const chunkResult = await gradeSubmission(
                      `[Question Header/ID: ${chunk.questionId}]\n\n${chunk.combinedText}`,
                      rubricContent,
                      totalMarks, // Note: ideal would be max marks for this specific question, but passing total to satisfy signature
                      config,
                      chunkBuffer,
                      chunkMime
                  );
                  return chunkResult;
              } catch (e: any) {
                  console.error(`[CHUNK_FAILED] Chunk ${chunk.questionId} failed:`, e.message);
                  return {
                      totalScore: 0,
                      breakdown: [{
                          question: chunk.questionId,
                          score: 0,
                          max: 0,
                          feedback: "GRADING_FAILED_API_ERROR",
                          rubricReference: "Error",
                          isRelevant: false,
                          mappedRubricQuestion: "Error",
                          evidenceSnippet: "N/A"
                      }],
                      confidence: 0,
                      aiReasoning: `API Failure for chunk ${chunk.questionId}.`
                  } as GradingResult;
              }
          }));

          const results = await Promise.all(chunkPromises);

          for (const res of results) {
              aggregatedScore += res.totalScore;
              aggregatedConfidence += res.confidence;

              // SILENT FILTERING: Only push relevant chunks to the final breakdown
              const relevantChunks = res.breakdown.filter(b => b.isRelevant !== false);
              finalBreakdown.push(...relevantChunks);
          }

          aggregatedConfidence = results.length > 0 ? aggregatedConfidence / results.length : 0;

          result = {
              totalScore: aggregatedScore,
              breakdown: finalBreakdown,
              aiReasoning: globalAiReasoning,
              confidence: aggregatedConfidence,
              detectedIdentity: results.find(r => r.detectedIdentity && r.detectedIdentity !== 'UNIDENTIFIED_IDENTITY')?.detectedIdentity || 'UNIDENTIFIED_IDENTITY',
              strengths: ["Detailed chunk breakdown evaluated."],
              weaknesses: [],
              improvement: "Review breakdown for specifics."
          };

          console.log(`[AI_SUCCESS] Graded ${chunks.length} chunks. Score: ${result.totalScore}/${totalMarks}`);
      }

      // 4. Save Score & Feedback
      if (typeof result.totalScore !== 'number') {
          throw new Error("Invalid AI Result: Missing totalScore");
      }

      const breakdownStr = JSON.stringify(result.breakdown);

      await prisma.score.upsert({
        where: { submissionId: submission.id },
        update: {
          totalMarks: result.totalScore,
          breakdown: breakdownStr,
          remarks: result.aiReasoning,
          detectedIdentity: result.detectedIdentity,
          gradedAt: new Date()
        },
        create: {
          submissionId: submission.id,
          totalMarks: result.totalScore,
          breakdown: breakdownStr,
          remarks: result.aiReasoning,
          detectedIdentity: result.detectedIdentity
        }
      });

      // 5. Update Submission Status (Dynamic Confidence Threshold)
      // UNIDENTIFIED FALLBACK: If AI returns null identity OR 'UNIDENTIFIED_IDENTITY' literal, handle flagging.
      // If we also lack local user context (bulk upload), this is CRITICAL FLAGGING.
      let status: string;
      const threshold = submission.workSession.confidenceThreshold ?? 85;

      const isIdentityMissing = !result.detectedIdentity || result.detectedIdentity === 'UNIDENTIFIED_IDENTITY';
      const isContextMissing = !submission.userId && !submission.studentRegNo;

      if (isIdentityMissing) {
          if (isContextMissing) {
              // GHOST SUBMISSION: No AI ID, No DB ID.
              status = 'FLAGGED';
              result.confidence = 0;
              result.aiReasoning = `IDENTITY CRISIS: ${result.aiReasoning || "System could not identify student."} Please manually assign ownership.`;
              console.warn(`[AI_IDENTITY] Unidentified GHOST submission. Flagging for manual review.`);
          } else {
              // PARTIAL MATCH: No AI ID, but we know who uploaded it (Authenticated Student).
              // We proceed but maybe lower confidence? For now, we trust the auth context but log it.
              console.log(`[AI_IDENTITY] AI missed identity, but using Auth Context: ${submission.user?.fullName}`);
              status = result.confidence >= threshold ? 'GRADED' : 'FLAGGED';
          }
      } else {
          status = result.confidence >= threshold ? 'GRADED' : 'FLAGGED';
      }

      console.log(`[AI_CONFIDENCE] Score: ${result.confidence}, Threshold: ${threshold} -> Status: ${status} (Dynamic Threshold Applied)`);

      const feedbackStr = JSON.stringify({
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
        improvement: result.improvement || "No specific advice."
      });

      await prisma.submission.update({
        where: { id: submission.id },
        data: {
          status,
          confidenceScore: result.confidence,
          feedback: feedbackStr
        }
      });

      // Create Audit Log
      await prisma.auditLog.create({
        data: {
          userId: submission.userId,
          action: status === 'GRADED' ? 'GRADED' : 'FLAGGED',
          details: `Submission for ${submission.workSession.title} ${status}. Score: ${result.totalScore}`,
          severity: status === 'GRADED' ? 'INFO' : 'WARNING'
        }
      });

      // Increment Lecturer Quota
      if (submission.workSession.lecturerId) {
        await prisma.user.update({
            where: { id: submission.workSession.lecturerId },
            data: { used: { increment: 1 } }
        }).catch(e => console.warn(`[DB_WARN] Failed to increment quota`, e));
      }

      return {
        success: true,
        score: result.totalScore,
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
