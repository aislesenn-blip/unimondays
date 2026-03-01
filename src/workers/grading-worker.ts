import 'pdfjs-dist/legacy/build/pdf.worker.mjs';

import { Job } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { readFile, saveBuffer } from '@/lib/storage';
import { ocrDocument } from '@/lib/ai/gemini';
import { gradeSubmission, GradeConfig, GradingResult } from '@/lib/ai/deepseek';
import { simulateDeepSeekCall } from '@/lib/ai/simulator';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import * as canvas from '@napi-rs/canvas';

if (!globalThis.DOMMatrix) {
  globalThis.DOMMatrix = canvas.DOMMatrix as any;
}
if (!globalThis.DOMPoint) {
  globalThis.DOMPoint = canvas.DOMPoint as any;
}
if (!globalThis.DOMRect) {
  globalThis.DOMRect = canvas.DOMRect as any;
}

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
          class: true,
          standardizedRubric: true
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

          console.log(`[FAN_OUT] Created ${chunks.length} chunks. Processing sequentially/parallel in-memory to guarantee execution speed...`);

          // Execute processing directly instead of enqueuing
          // Do not return here, let it fall through to the new in-memory aggregation logic
          // Note: The rest of the pipeline handles the chunking in-memory further down.
          // Wait, actually I should process them here, OR change the rest of the function to handle the chunked logic.
          // Let's modify the whole block.
      }

      // If <= 3 pages, fall through to normal grading logic (atomic)
  }

  try {
      // PARALLEL TASK 1: Submission OCR (Return buffer array for visual analysis)
      const submissionOcrTask = async (chunkPath?: string): Promise<{ text: string, buffers: Buffer[], mimeType: string }> => {
          let targetPath = chunkPath || submission.filePath;
          let ocrText = chunkPath ? null : submission.ocrText;

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
              if (!chunkPath) {
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

      // ---------------------------------------------------------
      // CHUNK EXTRACTION LOGIC (In-Memory Fan-out & Fan-in)
      // ---------------------------------------------------------
      let rubricContent: string;
      let questionPaperText: string | undefined;

      try {
          [rubricContent, questionPaperText] = await Promise.all([
              fetchStandardizedRubricTask(),
              questionPaperOcrTask()
          ]);
      } catch (e: any) {
          console.error("[GRADING FATAL ERROR]: Prerequisite Check Failed", e);
          throw new Error(`Prerequisite Check Failed: ${e.message}`);
      }

      // Reconstruct file checking block from the fan_out to get chunks
      let isPdf = false;
      let pageCount = 1;
      let chunks: { path: string, pageCount: number }[] = [];
      let srcDoc: PDFDocument | null = null;

      if (submission.filePath) {
          const buffer = await readFile(submission.filePath, 'exam_pdfs');
          isPdf = submission.filePath.toLowerCase().endsWith('.pdf') ||
                        (buffer.length > 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46);

          if (isPdf) {
              srcDoc = await PDFDocument.load(buffer);
              pageCount = srcDoc.getPageCount();
          }

          if (isPdf && srcDoc && pageCount > 3) {
              const CHUNK_SIZE = 3;
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
          }
      }

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

      const lecturerName = submission.workSession.lecturer.fullName || "Lecturer";
      const className = submission.workSession.class ? `${submission.workSession.class.code} - ${submission.workSession.class.name}` : "Unknown Class";
      const studentId = submission.studentRegNo || submission.user?.fullName || "Student";
      const sessionTitle = submission.workSession.title;

      const baseContextString = `
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
        context: baseContextString
      };

      const totalMarks = submission.workSession.totalMarks || 100;
      let result: GradingResult;

      if (chunks.length > 0 && job.type === 'AI_GRADE_SUBMISSION') {
          console.log(`[FAN_OUT] Dispatching ${chunks.length} AI_GRADE_CHUNK jobs...`);

          // Create chunk jobs
          for (const chunk of chunks) {
              await prisma.job.create({
                  data: {
                      type: 'AI_GRADE_CHUNK',
                      payload: JSON.stringify({
                          submissionId: submission.id,
                          chunkPath: chunk.path,
                          originalJobId: job.id
                      }),
                      status: 'PENDING'
                  }
              });
          }

          // Create the aggregate job
          await prisma.job.create({
              data: {
                  type: 'AI_GRADE_AGGREGATE',
                  payload: JSON.stringify({
                      submissionId: submission.id,
                      expectedChunks: chunks.length,
                      originalJobId: job.id
                  }),
                  status: 'PENDING'
              }
          });

          console.log(`[FAN_OUT] Successfully enqueued chunk jobs for Submission ${submission.id}. Exiting parent job.`);
          return { success: true, message: 'Fanned out chunk jobs' };

      } else if (job.type === 'AI_GRADE_CHUNK') {
          console.log(`[AI_GRADE_CHUNK] Processing chunk ${data.chunkPath}`);

          const submissionData = await submissionOcrTask(data.chunkPath);
          const { text: ocrText, buffers: submissionBuffers, mimeType: submissionMime } = submissionData;

          const chunkConfig: GradeConfig = {
              ...config,
              context: `Extract all questions/answers from THESE 3 PAGES ONLY. Maintain the sequence.\n\n${baseContextString}`
          };

          const chunkResult = await gradeSubmission(ocrText, rubricContent, totalMarks, chunkConfig, submissionBuffers, submissionMime);

          // Save result so the aggregate job can find it
          await prisma.job.update({
              where: { id: job.id },
              data: {
                  result: JSON.stringify(chunkResult),
                  status: 'COMPLETED'
              }
          });

          console.log(`[AI_GRADE_CHUNK] Completed chunk ${data.chunkPath}`);
          return { success: true, message: 'Chunk graded successfully' };

      } else if (job.type === 'AI_GRADE_AGGREGATE') {
          console.log(`[AI_GRADE_AGGREGATE] Checking completion status of chunks...`);

          // Check if all chunks are complete
          const allChunks = await prisma.job.findMany({
              where: {
                  type: 'AI_GRADE_CHUNK',
                  payload: { contains: `"originalJobId":"${data.originalJobId}"` }
              }
          });

          if (allChunks.length < data.expectedChunks) {
              console.warn(`[AI_GRADE_AGGREGATE] Waiting for all chunks to be enqueued. Retrying...`);
              throw new Error("RATE_LIMIT_HIT: Chunks not yet fully populated in DB.");
          }

          const pendingChunks = allChunks.filter(c => c.status !== 'COMPLETED');
          if (pendingChunks.length > 0) {
              console.log(`[AI_GRADE_AGGREGATE] Waiting on ${pendingChunks.length} chunks to complete. Delaying...`);
              throw new Error("RATE_LIMIT_HIT: Waiting for chunks to complete.");
              // Throws rate limit to pause the job cleanly without failing the submission
          }

          console.log(`[AI_GRADE_AGGREGATE] All chunks completed. Starting FAN_IN aggregation...`);

          const chunkResults = allChunks.map(c => JSON.parse(c.result || '{}'));

          const mergedResults = new Map<string, any>();
          let aggregatedStudentRemarks = "";
          let aggregatedTeacherRemarks = "";
          let detectedIdentity: string | null = null;

          for (const chunkResult of chunkResults) {
              if (chunkResult.detectedIdentity && !detectedIdentity) {
                  detectedIdentity = chunkResult.detectedIdentity;
              }

              if (chunkResult.studentRemarks) {
                  aggregatedStudentRemarks += chunkResult.studentRemarks + " ";
              }
              if (chunkResult.teacherRemarks) {
                  aggregatedTeacherRemarks += chunkResult.teacherRemarks + " ";
              }

              for (const qRes of chunkResult.results || []) {
                  // Must use the mapped question text/label for accurate tracking and merging
                  // The prompt returns `question_id` but in practice it represents the question label
                  const standardRubricObj = JSON.parse(rubricContent);
                  const dbQuestion = standardRubricObj.questions.find((q: any) => q.id === qRes.question_id || q.questionId === qRes.question_id || q.QuestionID === qRes.question_id);
                  const mergeKey = dbQuestion?.questionId || dbQuestion?.QuestionID || qRes.question_id;

                  if (!mergedResults.has(mergeKey)) {
                      mergedResults.set(mergeKey, {
                          question_id: qRes.question_id,
                          mergeKey: mergeKey, // Internal key for sorting later
                          status: qRes.status,
                          concept_results: [...(qRes.concept_results || [])],
                          justification: qRes.justification || "",
                          review_flag: !!qRes.review_flag,
                          confidence: qRes.confidence || 1.0
                      });
                  } else {
                      const existing = mergedResults.get(mergeKey);

                      // Status overwrite precedence
                      if (existing.status === "Not Attempted" && qRes.status !== "Not Attempted") {
                          existing.status = qRes.status;
                          existing.justification = qRes.justification || existing.justification;
                      } else if (qRes.status !== "Not Attempted" && qRes.justification) {
                          if (!existing.justification.includes(qRes.justification)) {
                              existing.justification += " " + qRes.justification;
                          }
                      }

                      // Deduplicate Concept Units
                      const mergedConcepts = new Map<string, any>();
                      // Add existing ones
                      for (const c of existing.concept_results) {
                          mergedConcepts.set(c.conceptId, c);
                      }
                      // Merge new ones
                      for (const newC of qRes.concept_results || []) {
                          if (mergedConcepts.has(newC.conceptId)) {
                              const existingC = mergedConcepts.get(newC.conceptId);
                              // Keep the one with higher marks if duplicate
                              const newMarks = Number(newC.awardedMarks) || 0;
                              const oldMarks = Number(existingC.awardedMarks) || 0;
                              if (newMarks > oldMarks) {
                                  mergedConcepts.set(newC.conceptId, newC);
                              }
                          } else {
                              mergedConcepts.set(newC.conceptId, newC);
                          }
                      }

                      existing.concept_results = Array.from(mergedConcepts.values());
                      existing.review_flag = existing.review_flag || !!qRes.review_flag;
                      existing.confidence = (existing.confidence + (qRes.confidence || 1.0)) / 2;
                  }
              }
          }

          // SORTING LOGIC: Convert map values and sort alphanumerically by mergeKey (e.g., Q1, Q2, Q10)
          const sortedMergedArray = Array.from(mergedResults.values()).sort((a, b) => {
              const parseNum = (str: string) => {
                  const match = str.match(/\d+/);
                  return match ? parseInt(match[0], 10) : 0;
              };
              const numA = parseNum(a.mergeKey);
              const numB = parseNum(b.mergeKey);
              if (numA !== numB) {
                  return numA - numB;
              }
              return a.mergeKey.localeCompare(b.mergeKey);
          });

          result = {
              exam_id: submission.workSessionId,
              results: sortedMergedArray,
              detectedIdentity: detectedIdentity,
              studentRemarks: aggregatedStudentRemarks.trim(),
              teacherRemarks: aggregatedTeacherRemarks.trim()
          };

          console.log(`[AI_GRADE_AGGREGATE] Aggregation and Sorting complete.`);

      } else {
          // Normal atomic execution
          const submissionData = await submissionOcrTask();
          const { text: ocrText, buffers: submissionBuffers, mimeType: submissionMime } = submissionData;

          if (!process.env.DEEPSEEK_API_KEY) {
              console.log(`[Simulator] Using DeepSeek Simulator`);
              const sim = await simulateDeepSeekCall(ocrText);
              if (sim.breakdown === "INVALID_JSON_RESPONSE") throw new Error("AI returned malformed JSON (Simulator)");
              throw new Error("Simulator not supported for Phase 2 Atomic Grading.");
          } else {
              result = await gradeSubmission(ocrText, rubricContent, totalMarks, config, submissionBuffers, submissionMime);
              console.log(`[AI_SUCCESS] Atomic Validation Complete.`);
          }
      }

      // --- DETERMINISTIC MATH ENGINE ---
      let computedTotalMarks = 0;
      let totalConfidenceSum = 0;
      let reviewFlagsCount = 0;
      let validQuestionsCount = 0;

      // Ensure we have a valid parsed rubric to match against for limits
      const standardRubric = JSON.parse(rubricContent);

      const formattedBreakdown = result.results?.map((qResult) => {
          let questionScore = 0;

          // Match the question in the DB rubric to find limits
          const dbQuestion = standardRubric.questions.find((q: any) => q.id === qResult.question_id || q.questionId === qResult.question_id || q.QuestionID === qResult.question_id);

          let maxMarksForQuestion = 0;
          if (dbQuestion) {
              if (dbQuestion.conceptUnits && Array.isArray(dbQuestion.conceptUnits)) {
                  maxMarksForQuestion = dbQuestion.conceptUnits.reduce((sum: number, c: any) => sum + (Number(c.marks) || Number(c.Marks) || 0), 0);
              }
              if (maxMarksForQuestion === 0) {
                  maxMarksForQuestion = dbQuestion.marksAllocated || 0;
              }
          }
          maxMarksForQuestion = Number(maxMarksForQuestion.toFixed(1));

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
          questionScore = Number(questionScore.toFixed(1));

          // Note: OutOfScope and Penalties logic would be applied here based on AI flags.
          // For V3 MVP, we just sum concepts and cap at max marks.

          computedTotalMarks += questionScore;
          totalConfidenceSum += (typeof qResult.confidence === 'number' && !isNaN(qResult.confidence) ? qResult.confidence : 1.0);
          if (qResult.review_flag) reviewFlagsCount++;
          validQuestionsCount++;

          return {
              label: dbQuestion?.questionId || dbQuestion?.QuestionID || qResult.question_id,
              question_number: dbQuestion?.questionId || dbQuestion?.QuestionID || qResult.question_id,
              question: dbQuestion?.questionText || dbQuestion?.QuestionText || qResult.question_id || "Unknown",
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

      let finalMarks = Number(computedTotalMarks.toFixed(1));
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
              remarks: result.studentRemarks || "No remarks.",
              studentRemarks: result.studentRemarks || "No student feedback provided.",
              teacherRemarks: result.teacherRemarks || "No teacher feedback provided.",
              detectedIdentity: result.detectedIdentity || null,
              gradedAt: new Date()
            },
            create: {
              submissionId: submission.id,
              totalMarks: finalMarks,
              breakdown: breakdownStr,
              remarks: result.studentRemarks || "No remarks.",
              studentRemarks: result.studentRemarks || "No student feedback provided.",
              teacherRemarks: result.teacherRemarks || "No teacher feedback provided.",
              detectedIdentity: result.detectedIdentity || null
            }
          });

          // Insert Concept Results
          if (result.results && Array.isArray(result.results)) {
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

      const isIdentityMissing = !result.detectedIdentity || result.detectedIdentity === 'UNIDENTIFIED_IDENTITY';
      const isContextMissing = !submission.userId && !submission.studentRegNo;

      if (isIdentityMissing) {
          if (isContextMissing) {
              // GHOST SUBMISSION: No AI ID, No DB ID.
              status = 'FLAGGED';
              computedConfidence = 0;
              result.teacherRemarks = `IDENTITY CRISIS: ${result.teacherRemarks || "System could not identify student."} Please manually assign ownership.`;
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
