import { Job } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { readFile, saveBuffer } from '@/lib/storage';
import { ocrDocument } from '@/lib/ai/gemini';
import { gradeSubmission, GradeConfig, GradingResult } from '@/lib/ai/deepseek';
import { simulateDeepSeekCall } from '@/lib/ai/simulator';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { pdf } from 'pdf-to-img';
import { v4 as uuidv4 } from 'uuid';

export async function handleAiGrade(job: Job) {
  let data: any;
  try {
     data = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
  } catch (e) {
     console.error("[GRADING FATAL ERROR]: Invalid job payload JSON", e);
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

  console.log(`[GRADING_START] Submission ID: ${submissionId}, WorkSession: ${submission.workSession.title}, Job Type: ${job.type}`);

  if (job.type === 'AI_GRADE_SUBMISSION') {
      // --- FAN-OUT: PDF Chunking ---
      if (!submission.filePath) throw new Error("No file path for submission.");

      const buffer = await readFile(submission.filePath, 'exam_pdfs');
      const isPdf = submission.filePath.toLowerCase().endsWith('.pdf') ||
                    (buffer.length > 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46);

      let needsChunking = false;
      let pageCount = 1;
      let srcDoc: PDFDocument | null = null;

      if (isPdf) {
          srcDoc = await PDFDocument.load(buffer);
          pageCount = srcDoc.getPageCount();
          if (pageCount > 3) {
              needsChunking = true;
          }
      }

      if (needsChunking && srcDoc) {
          console.log(`[FAN_OUT] Submission ${submissionId} has ${pageCount} pages. Chunking...`);
          const CHUNK_SIZE = 3;
          const chunks: { path: string, pageCount: number }[] = [];

          for (let start = 0; start < pageCount; start += CHUNK_SIZE) {
              const end = Math.min(start + CHUNK_SIZE, pageCount);
              const newDoc = await PDFDocument.create();
              const pageIndices = Array.from({ length: end - start }, (_, i) => start + i);
              const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
              copiedPages.forEach(page => newDoc.addPage(page));
              const chunkBytes = await newDoc.save();
              const sliceBuffer = Buffer.from(chunkBytes);

              const uniqueSuffix = uuidv4().substring(0, 8);
              const fileName = `chunk_${submission.id}_${start}_${end}_${uniqueSuffix}.pdf`;

              const slicePath = await saveBuffer(sliceBuffer, fileName, 'exam_pdfs');
              chunks.push({ path: slicePath, pageCount: end - start });
          }

          console.log(`[FAN_OUT] Created ${chunks.length} chunks. Enqueueing AI_GRADE_CHUNK jobs...`);

          await Promise.all(chunks.map(async (chunk, index) => {
              await prisma.job.create({
                  data: {
                      type: 'AI_GRADE_CHUNK',
                      payload: JSON.stringify({
                          submissionId: submission.id,
                          chunkPath: chunk.path,
                          chunkIndex: index,
                          totalChunks: chunks.length
                      }),
                      status: 'PENDING'
                  }
              });
          }));

          await prisma.submission.update({
              where: { id: submissionId },
              data: { status: 'PROCESSING' }
          });

          return { success: true, message: `Fan-out complete. Enqueued ${chunks.length} chunks.` };
      }
      // If <= 5 pages, fall through to normal grading logic (atomic)
  }

  try {
      // PARALLEL TASK 1: Submission OCR (Return buffer array for visual analysis)
      const submissionOcrTask = async (): Promise<{ text: string, buffers: Buffer[], mimeType: string }> => {
          let targetPath = submission.filePath;
          let ocrText = submission.ocrText;

          if (job.type === 'AI_GRADE_CHUNK') {
              const { chunkPath } = data;
              if (!chunkPath) throw new Error("No chunkPath provided for AI_GRADE_CHUNK.");
              targetPath = chunkPath;
              ocrText = null; // Do not use the full submission's cached OCR for a chunk
          }

          if (!targetPath) throw new Error("No file path and no OCR text for submission.");

          console.log(`[SUPABASE_FETCH] Target File: ${targetPath}`);
          const buffer = await readFile(targetPath, 'exam_pdfs');

          const mimeType = targetPath.toLowerCase().endsWith('.png') ? 'image/png' :
                           targetPath.toLowerCase().endsWith('.jpg') || targetPath.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' :
                           'application/pdf';

          let imageBuffers: Buffer[] = [];

          if (mimeType === 'application/pdf') {
              console.log(`[PDF_TO_IMG] Converting PDF to image array...`);
              try {
                  const document = await pdf(buffer, { scale: 2.0 }); // Render at higher resolution
                  for await (const page of document) {
                      imageBuffers.push(page);
                  }
                  console.log(`[PDF_TO_IMG] Generated ${imageBuffers.length} images from PDF.`);
              } catch (pdfError) {
                  console.error("[PDF_TO_IMG ERROR] Failed to convert PDF to images:", pdfError);
                  throw new Error(`PDF to Image conversion failed: ${pdfError}`);
              }
          } else {
              imageBuffers = [buffer];
          }

          if (ocrText) {
              console.log(`[OCR_SKIP] Submission already OCR'd. Length: ${ocrText.length}`);
              return { text: ocrText, buffers: imageBuffers, mimeType: mimeType === 'application/pdf' ? 'image/png' : mimeType };
          }

          // Deep Audit Fix: Vision Pre-processing (Payload Integrity)
          // Ensure images are not absurdly large before sending to vision models to prevent "Math Blindspots"
          const processedBuffers: Buffer[] = [];
          for (let i = 0; i < imageBuffers.length; i++) {
              let imgBuf = imageBuffers[i];
              if (imgBuf.length > 5 * 1024 * 1024) { // Compress if individual image > 5MB
                  console.warn(`[VISION_WARN] Image ${i+1} is large (${(imgBuf.length / 1024 / 1024).toFixed(2)} MB). Applying compression...`);
                  try {
                      imgBuf = await sharp(imgBuf)
                          .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
                          .jpeg({ quality: 80 })
                          .toBuffer();
                      console.log(`[VISION_OPT] Image ${i+1} compressed to ${(imgBuf.length / 1024 / 1024).toFixed(2)} MB`);
                  } catch (sharpError) {
                      console.error(`[VISION_ERROR] Failed to compress image ${i+1} with sharp:`, sharpError);
                  }
              }
              processedBuffers.push(imgBuf);
          }

          try {
              console.log(`[OCR_START] Sending ${processedBuffers.length} images to Gemini...`);
              // Provide as image/png if converted from PDF, otherwise use original mimetype
              const actualMimeType = mimeType === 'application/pdf' ? 'image/png' : mimeType;
              const text = await ocrDocument(processedBuffers, actualMimeType);
              console.log(`[OCR_SUCCESS] Extracted ${text.length} characters.`);

              // Save immediately
              if (job.type !== 'AI_GRADE_CHUNK') {
                  await prisma.submission.update({
                      where: { id: submissionId },
                      data: { ocrText: text, status: 'PROCESSING' }
                  });
              }
              return { text, buffers: processedBuffers, mimeType: actualMimeType };
          } catch (ocrError: any) {
              console.error("[GRADING FATAL ERROR]: OCR Processing Failed", ocrError);
              throw new Error(`OCR Processing Failed: ${ocrError.message}`);
          }
      };

      // PARALLEL TASK 2: Fetch Standardized Rubric (Phase 2)
      // Instead of raw OCR text, fetch the structured JSON representation.
      const fetchStandardizedRubricTask = async () => {
          if (!submission.workSession.standardizedRubricId) {
               throw new Error("No Standardized Rubric linked to this WorkSession. Grading aborted in Phase 2 Atomic Mode.");
          }
          const rubric = await prisma.standardizedRubric.findUnique({
              where: { id: submission.workSession.standardizedRubricId },
              include: {
                  questions: {
                      include: {
                          conceptUnits: true,
                          evaluationTiers: true,
                          outOfScopeRules: true,
                          penaltyRules: true
                      }
                  }
              }
          });

          if (!rubric) {
               throw new Error("Linked Standardized Rubric not found in database. Grading aborted.");
          }
          return JSON.stringify(rubric, null, 2);
      };

      // PARALLEL TASK 4: Question Paper OCR (Master Skeleton)
      const questionPaperOcrTask = async (): Promise<string | undefined> => {
          const qp = submission.workSession.questionPaperUrl;
          if (!qp) return undefined;

          try {
              console.log(`[SUPABASE_FETCH] Question Paper: ${qp}`);
              const buffer = await readFile(qp, 'exam_pdfs');
              const mimeType = qp.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';
              const text = await ocrDocument(buffer, mimeType);
              console.log(`[OCR_SUCCESS] Question Paper extracted: ${text.length} chars.`);
              return text;
          } catch (e: any) {
              console.error("[GRADING FATAL ERROR]: Question Paper OCR failed", e);
              console.warn("[OCR_WARN] Question Paper OCR failed.", e.message);
              return undefined;
          }
      };

      // EXECUTE PARALLEL TASKS
      let submissionData: { text: string, buffers: Buffer[], mimeType: string };
      let rubricContent: string;
      let questionPaperText: string | undefined;

      try {
          if (job.type === 'AI_GRADE_AGGREGATE') {
              [rubricContent, questionPaperText] = await Promise.all([
                  fetchStandardizedRubricTask(),
                  questionPaperOcrTask()
              ]);
              submissionData = { text: "AGGREGATED_JOB", buffers: [], mimeType: "application/pdf" };
          } else {
              [submissionData, rubricContent, questionPaperText] = await Promise.all([
                  submissionOcrTask(),
                  fetchStandardizedRubricTask(),
                  questionPaperOcrTask()
              ]);
          }
      } catch (e: any) {
          console.error("[GRADING FATAL ERROR]: Prerequisite Check Failed", e);
          throw new Error(`Prerequisite Check Failed: ${e.message}`);
      }

      const { text: ocrText, buffers: submissionBuffers, mimeType: submissionMime } = submissionData;

      // Prepare Config
      const strictnessMap: Record<string, number> = {
        'LENIENT': 0.8, 'MODERATE': 1.0, 'STRICT': 1.2
      };
      const strictnessVal = strictnessMap[submission.workSession.strictness || 'MODERATE'] || 1.0;

      let calibrationSettings;
      try {
          calibrationSettings = submission.workSession.calibration ? JSON.parse(submission.workSession.calibration) : undefined;
      } catch (e) {
          console.error("[GRADING FATAL ERROR]: Failed to parse calibration JSON", e);
      }

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
        questionPaper: questionPaperText,
        lecturerNotes: submission.workSession.instructions || undefined,
        calibration: calibrationSettings,
        context: contextString
      };

      // 3. Grade (Zero-Trust Tracing)
      const totalMarks = submission.workSession.totalMarks || 100;

      console.log(`[AI_GRADE] Invoking AI for Job ${job.id}`);
      console.log(`- Config: Strictness=${config.strictness}`);
      console.log(`- Context: ${contextString.trim()}`);
      console.log(`- Payload: Submission=${ocrText.length} chars, Rubric=${rubricContent.length} chars`);
      if (submissionBuffers && submissionBuffers.length > 0) {
          console.log(`- Visual: ${submissionBuffers.length} Buffers loaded (${submissionMime})`);
      }

      let result: GradingResult | undefined;

      if (job.type === 'AI_GRADE_AGGREGATE') {
          console.log(`[FAN_IN] Aggregating results for ${submissionId}...`);

          // L10 Hardening: Strict bounds for UUID to prevent accidental LIKE matches
          const chunkJobs = await prisma.job.findMany({
              where: {
                  type: 'AI_GRADE_CHUNK',
                  payload: { contains: `"submissionId":"${submissionId}"` }, // Safe enough given UUID v4 format
                  status: 'COMPLETED'
              }
          });

          if (chunkJobs.length === 0) {
              throw new Error("No completed chunks found for aggregation.");
          }

          const mergedResults: Record<string, any> = {};
          let aggregatedStudentRemarks = "";
          let aggregatedTeacherRemarks = "";
          let detectedIdentity: string | null = null;

          // Verify sequence sorting by chunkIndex if available (payload has chunkIndex)
          const sortedChunks = chunkJobs.sort((a, b) => {
              try {
                  const aPayload = JSON.parse(a.payload);
                  const bPayload = JSON.parse(b.payload);
                  return (aPayload.chunkIndex || 0) - (bPayload.chunkIndex || 0);
              } catch (e) {
                  return 0;
              }
          });

          for (const chunkJob of sortedChunks) {
              if (!chunkJob.result) continue;
              let chunkOutput;
              try {
                  chunkOutput = JSON.parse(chunkJob.result);
              } catch (e) {
                  console.warn("Failed to parse chunk job result", e);
                  throw new Error("Strict Rule Failure: A chunk failed to parse as valid JSON. Requires retry.");
              }

              if (!chunkOutput.result) continue;
              const chunkGradingResult = chunkOutput.result;

              if (chunkGradingResult.detectedIdentity && !detectedIdentity) {
                  detectedIdentity = chunkGradingResult.detectedIdentity;
              }

              if (chunkGradingResult.studentRemarks) {
                  aggregatedStudentRemarks += chunkGradingResult.studentRemarks + " ";
              }
              if (chunkGradingResult.teacherRemarks) {
                  aggregatedTeacherRemarks += chunkGradingResult.teacherRemarks + " ";
              }

              for (const qRes of chunkGradingResult.results || []) {
                  const qId = qRes.question_id;
                  if (!mergedResults[qId]) {
                      mergedResults[qId] = {
                          question_id: qId,
                          status: qRes.status,
                          concept_results: [...(qRes.concept_results || [])],
                          justification: qRes.justification || "",
                          review_flag: !!qRes.review_flag,
                          confidence: qRes.confidence || 1.0
                      };
                  } else {
                      // Accumulate concept results
                      mergedResults[qId].concept_results.push(...(qRes.concept_results || []));
                      if (qRes.justification) {
                          mergedResults[qId].justification += "\n" + qRes.justification;
                      }
                      mergedResults[qId].review_flag = mergedResults[qId].review_flag || !!qRes.review_flag;
                      // average confidence
                      mergedResults[qId].confidence = (mergedResults[qId].confidence + (qRes.confidence || 1.0)) / 2;
                  }
              }
          }

          result = {
              exam_id: submission.workSessionId,
              results: Object.values(mergedResults),
              detectedIdentity: detectedIdentity,
              studentRemarks: aggregatedStudentRemarks.trim(),
              teacherRemarks: aggregatedTeacherRemarks.trim()
          };

          console.log(`[FAN_IN] Aggregation complete. Passing to Deterministic Math Engine.`);

      } else {
          // Simulator Check
          if (!process.env.DEEPSEEK_API_KEY) {
              console.log(`[Simulator] Using DeepSeek Simulator`);
              const sim = await simulateDeepSeekCall(ocrText);
              if (sim.breakdown === "INVALID_JSON_RESPONSE") throw new Error("AI returned malformed JSON (Simulator)");

              // We won't maintain the simulator in Phase 2 for brevity, just throw or bypass
              throw new Error("Simulator not supported for Phase 2 Atomic Grading.");
          } else {
              // Pass image buffers for multimodal grading

              if (job.type === 'AI_GRADE_CHUNK') {
                  config.context = (config.context || "") + "\n\nCRITICAL INSTRUCTION: Extract all questions/answers from THESE 3 PAGES ONLY. Maintain the sequence.";
                  let attempt = 0;
                  const maxAttempts = 3;
                  while (attempt < maxAttempts) {
                      attempt++;
                      try {
                          result = await gradeSubmission(ocrText, rubricContent, totalMarks, config, submissionBuffers, submissionMime);
                          break; // Success
                      } catch (e: any) {
                          console.warn(`[AI_CHUNK_RETRY] Chunk evaluation failed on attempt ${attempt}: ${e.message}`);
                          if (attempt >= maxAttempts) throw new Error(`Chunk evaluation failed after ${maxAttempts} attempts: ${e.message}`);
                      }
                  }
              } else {
                  result = await gradeSubmission(ocrText, rubricContent, totalMarks, config, submissionBuffers, submissionMime);
              }

              console.log(`[AI_SUCCESS] Atomic Validation Complete.`);
          }
      }

      if (job.type === 'AI_GRADE_CHUNK') {
          const { totalChunks } = data;

          const completedChunks = await prisma.job.count({
              where: {
                  type: 'AI_GRADE_CHUNK',
                  payload: { contains: `"submissionId":"${submissionId}"` },
                  status: 'COMPLETED'
              }
          });

          // +1 because THIS job is currently PROCESSING and will be COMPLETED right after returning
          if (completedChunks + 1 === totalChunks) {
              console.log(`[FAN_IN] All ${totalChunks} chunks completed for ${submissionId}. Enqueueing AI_GRADE_AGGREGATE...`);
              await prisma.job.create({
                  data: {
                      type: 'AI_GRADE_AGGREGATE',
                      payload: JSON.stringify({ submissionId }),
                      status: 'PENDING'
                  }
              });
          }

          return { success: true, result }; // will be saved into job.result
      }

      // --- DETERMINISTIC MATH ENGINE ---
      let computedTotalMarks = 0;
      let totalConfidenceSum = 0;
      let reviewFlagsCount = 0;
      let validQuestionsCount = 0;

      // Ensure we have a valid parsed rubric to match against for limits
      const standardRubric = JSON.parse(rubricContent);

      const formattedBreakdown = result?.results?.map((qResult) => {
          let questionScore = 0;

          // Match the question in the DB rubric to find limits
          const dbQuestion = standardRubric.questions.find((q: any) => q.questionId === qResult.question_id);
          const maxMarksForQuestion = dbQuestion ? dbQuestion.marksAllocated : 0;

          // L10 Hardening: Deterministic Math Sandbox. Prevent AI Hallucinations.
          // 1. Sum up concepts strictly
          for (const concept of qResult.concept_results || []) {
              // Strip any weird AI string characters if it hallucinated a string like "2 marks"
              const rawVal = typeof concept.awardedMarks === 'string' ? parseFloat(String(concept.awardedMarks).replace(/[^0-9.]/g, '')) : concept.awardedMarks;
              let awarded = Number(rawVal);

              if (isNaN(awarded) || awarded < 0) {
                  awarded = 0; // Absolute fallback
              }
              questionScore += awarded;
          }

          // 2. Cap at Max Marks strictly to prevent 150/100 hallucinations
          if (questionScore > maxMarksForQuestion) {
              questionScore = maxMarksForQuestion;
          }

          // 3. Ensure float precision doesn't cause floating point errors (e.g. 0.1 + 0.2 = 0.30000000000000004)
          questionScore = Math.round(questionScore * 10) / 10;


          // Note: OutOfScope and Penalties logic would be applied here based on AI flags.
          // For V3 MVP, we just sum concepts and cap at max marks.

          computedTotalMarks += questionScore;
          totalConfidenceSum += (typeof qResult.confidence === 'number' && !isNaN(qResult.confidence) ? qResult.confidence : 1.0);
          if (qResult.review_flag) reviewFlagsCount++;
          validQuestionsCount++;

          return {
              question: qResult.question_id || "Unknown",
              score: questionScore,
              max: maxMarksForQuestion,
              feedback: qResult.justification || "No justification provided.",
              status: qResult.status || "Attempted",
              review_flag: !!qResult.review_flag,
              confidence: qResult.confidence
          };
      }) || [];

      // Calculate True Confidence based on variance/ambiguity (review flags)
      const baseConfidence = validQuestionsCount > 0 ? (totalConfidenceSum / validQuestionsCount) : 1.0;
      // Penalty for excessive review flags: -10% per flag
      let computedConfidence = Math.max(0, Math.min(100, Math.round((baseConfidence - (reviewFlagsCount * 0.1)) * 100)));

      let finalMarks = computedTotalMarks;
      if (isNaN(finalMarks)) {
          finalMarks = 0;
      }

      const breakdownStr = JSON.stringify(formattedBreakdown);

      try {
          const scoreRecord = await prisma.score.upsert({
            where: { submissionId: submission.id },
            update: {
              totalMarks: finalMarks,
              breakdown: breakdownStr,
              remarks: result?.studentRemarks || "No remarks.",
              studentRemarks: result?.studentRemarks || "No student feedback provided.",
              teacherRemarks: result?.teacherRemarks || "No teacher feedback provided.",
              detectedIdentity: result?.detectedIdentity || null,
              gradedAt: new Date()
            },
            create: {
              submissionId: submission.id,
              totalMarks: finalMarks,
              breakdown: breakdownStr,
              remarks: result?.studentRemarks || "No remarks.",
              studentRemarks: result?.studentRemarks || "No student feedback provided.",
              teacherRemarks: result?.teacherRemarks || "No teacher feedback provided.",
              detectedIdentity: result?.detectedIdentity || null
            }
          });

          // Insert Concept Results
          if (result?.results && Array.isArray(result.results)) {
              for (const q of result.results) {
                  if (q.concept_results && Array.isArray(q.concept_results)) {
                      for (const c of q.concept_results) {
                          await prisma.studentConceptResult.create({
                              data: {
                                  scoreId: scoreRecord.id,
                                  conceptId: c.conceptId,
                                  status: c.status,
                                  awardedMarks: c.awardedMarks,
                                  reasoning: c.reasoning
                              }
                          });
                      }
                  }
              }
          }

      } catch (dbError) {
          console.error("[GRADING FATAL ERROR] Failed to write Score to Database:", dbError);
          throw new Error("Failed to write Score to Database");
      }

      // 5. Update Submission Status (Dynamic Confidence Threshold)
      // UNIDENTIFIED FALLBACK: If AI returns null identity OR 'UNIDENTIFIED_IDENTITY' literal, handle flagging.
      // If we also lack local user context (bulk upload), this is CRITICAL FLAGGING.
      let status: string;
      const threshold = submission.workSession.confidenceThreshold ?? 85;

      const isIdentityMissing = !result?.detectedIdentity || result?.detectedIdentity === 'UNIDENTIFIED_IDENTITY';
      const isContextMissing = !submission.userId && !submission.studentRegNo;

      if (isIdentityMissing) {
          if (isContextMissing) {
              // GHOST SUBMISSION: No AI ID, No DB ID.
              status = 'FLAGGED';
              computedConfidence = 0;
              if (result) result.teacherRemarks = `IDENTITY CRISIS: ${result?.teacherRemarks || "System could not identify student."} Please manually assign ownership.`;
              console.warn(`[AI_IDENTITY] Unidentified GHOST submission. Flagging for manual review.`);
          } else {
              // PARTIAL MATCH: No AI ID, but we know who uploaded it (Authenticated Student).
              // We proceed but maybe lower confidence? For now, we trust the auth context but log it.
              console.log(`[AI_IDENTITY] AI missed identity, but using Auth Context: ${submission.user?.fullName}`);
              status = computedConfidence >= threshold ? 'GRADED' : 'FLAGGED';
          }
      } else {
          status = computedConfidence >= threshold ? 'GRADED' : 'FLAGGED';
      }

      console.log(`[AI_CONFIDENCE] True Confidence: ${computedConfidence}, Threshold: ${threshold} -> Status: ${status} (Dynamic Threshold Applied)`);

      const feedbackStr = JSON.stringify({
        strengths: [],
        weaknesses: [],
        improvement: "Detailed feedback via AI is now embedded in question breakdowns."
      });

      await prisma.submission.update({
        where: { id: submission.id },
        data: {
          status,
          confidenceScore: computedConfidence,
          feedback: feedbackStr
        }
      });

      // Create Audit Log
      try {
          // Prisma might fail if userId is undefined instead of null, but in schema it is `String?`
          await prisma.auditLog.create({
            data: {
              userId: submission.userId || null,
              action: status === 'GRADED' ? 'GRADED' : 'FLAGGED',
              details: `Submission for ${submission.workSession.title} ${status}. Score: ${finalMarks}`,
              severity: status === 'GRADED' ? 'INFO' : 'WARNING'
            }
          });
      } catch (auditError) {
          console.error("[GRADING WARNING] Failed to create AuditLog. Proceeding anyway.", auditError);
      }

      // Increment Lecturer Quota
      if (submission.workSession.lecturerId) {
        await prisma.user.update({
            where: { id: submission.workSession.lecturerId },
            data: { used: { increment: 1 } }
        }).catch(e => console.warn(`[DB_WARN] Failed to increment quota`, e));
      }

      return {
        success: true,
        score: computedTotalMarks,
        status
      };

  } catch (fatalError: any) {
      console.error(`[GRADING FATAL ERROR] Pipeline Crashed:`, fatalError);

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
