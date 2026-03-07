import { prisma } from '@/lib/prisma';
import { extractPagesMultimodal, ocrDocument } from '@/lib/ai/gemini';
import { gradeSubmission } from '@/lib/ai/deepseek';
import { readFile } from '@/lib/storage';

export async function handleAiGrade(job: any) {
    console.log(`[WORKER] Booting Single-Thread Sequence for Job ${job.id}`);

    let submissionIdToUpdate: string | null = null;

    try {
        const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
        submissionIdToUpdate = payload.submissionId;

        const submission = await prisma.submission.findUnique({
            where: { id: payload.submissionId },
            include: { workSession: true }
        });

        if (!submission) throw new Error("Submission not found");

        // 1. SEQUENTIAL EXTRACTION (NO PROMISE.ALL)
        console.log("[WORKER] Step 1: Loading Marking Scheme...");
        const markingSchemeText = await getOrExtractText(submission.workSession.markingScheme);

        console.log("[WORKER] Step 2: Loading Rubric...");
        const rubricContent = await getOrExtractText(submission.workSession.rubricUrl);

        console.log("[WORKER] Step 3: Extracting Student Exam (Memory Safe)...");
        if (!submission.filePath) throw new Error("Submission missing file path");

        const examBuffer = await readFile(submission.filePath, 'exam_pdfs');
        const examPages = await extractPagesMultimodal(examBuffer);
        const rawText = examPages.map(p => p.text).join('\n\n');

        // 2. HOLISTIC GRADING (DIET JSON)
        console.log("[WORKER] Step 4: Grading via DeepSeek...");
        const result = await gradeSubmission(rawText, rubricContent, markingSchemeText);

        // 3. TRANSFORM & SAVE
        console.log("[WORKER] Step 5: Saving Diet JSON to DB...");
        // Ensure result exists and has results array
        const resultsArray = result.results || [];
        const totalScore = resultsArray.reduce((acc: number, item: any) => acc + (Number(item.s) || 0), 0);

        // Convert the "Diet JSON" back into the schema structure the UI expects for `breakdown`
        const mappedBreakdown = resultsArray.map((item: any) => ({
            question: item.q,
            score: item.s,
            feedback: item.f,
            isRelevant: true,
            mappedRubricQuestion: `Q: ${item.q}`
        }));

        await prisma.score.upsert({
            where: { submissionId: submission.id },
            update: {
                totalMarks: totalScore,
                breakdown: JSON.stringify(mappedBreakdown),
                remarks: "Diet JSON Output Generated."
            },
            create: {
                submissionId: submission.id,
                totalMarks: totalScore,
                breakdown: JSON.stringify(mappedBreakdown),
                remarks: "Diet JSON Output Generated."
            }
        });

        // 4. UPDATE SUBMISSION TO COMPLETED
        await prisma.submission.update({
            where: { id: submission.id },
            data: { status: 'GRADED' }
        });

        console.log(`[WORKER] Mission Accomplished for Submission ${submission.id}`);

    } catch (fatalError: any) {
        console.error(`[WORKER] Error:`, fatalError.message);

        if (submissionIdToUpdate) {
            await prisma.submission.update({
                where: { id: submissionIdToUpdate },
                data: { status: 'FAILED', feedback: JSON.stringify({ error: fatalError.message }) }
            }).catch(e => console.error("Failed to update status to FAILED", e));
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
      // STAGE 1: PARALLEL MULTIMODAL EXTRACTION (TRANSCRIPTION ONLY)
      const submissionExtractionTask = async (): Promise<{ rawText: string }> => {
          if (!submission.filePath) throw new Error("No file path for submission.");

          console.log(`[SUPABASE_FETCH] Submission File: ${submission.filePath}`);
          const buffer = await readFile(submission.filePath, 'exam_pdfs');

          // 1. Multimodal Page Extraction
          console.log(`[MULTIMODAL_START] Extracting pages from PDF buffer...`);
          const pages: PageData[] = await extractPagesMultimodal(buffer);

          // 2. Holistic Context Assembly (Stage 2 Prep)
          const rawText = pages.map(p => p.extractedText).join('\n\n--- PAGE BREAK ---\n\n');

          // Cache the extraction
          await prisma.submission.update({
              where: { id: submissionId },
              data: { ocrText: rawText, status: 'PROCESSING' }
          });

          return { rawText };
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
          // If it's already plain text (cached), return it directly
          if (!ms.startsWith('rubrics/') && !ms.startsWith('bulk_uploads/') && !ms.includes('/') && !ms.toLowerCase().endsWith('.pdf')) {
              return ms;
          }

          if (ms.startsWith('rubrics/') || ms.startsWith('bulk_uploads/') || ms.includes('/') || ms.toLowerCase().endsWith('.pdf')) {
              try {
                  console.log(`[SUPABASE_FETCH] Marking Scheme: ${ms}`);
                  const buffer = await readFile(ms, 'exam_pdfs');
                  const mimeType = ms.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';
                  const text = await ocrDocument(buffer, mimeType);

                  // Cache OCR result to prevent redundant processing
                  if (text && text.length > 50) {
                      await prisma.workSession.update({
                          where: { id: submission.workSession.id },
                          data: { markingScheme: text }
                      }).catch(e => console.warn("[DB_WARN] Failed to cache marking scheme", e));
                  }

                  return text;
              } catch (e: any) {
                  console.warn("[OCR_WARN] Marking Scheme OCR failed.", e.message);
                  return undefined;
              }
          }
          return ms;
      };

      // EXECUTE INITIAL PARALLEL TASKS
      let extractedData: { rawText: string };
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

      const { rawText } = extractedData;

      // Identity Extraction: Scavenge the raw text for a registration number
      const idMatch = rawText.match(/(?:REGISTRATION NUMBER|REG NO|STUDENT ID)[\s:]*([A-Za-z0-9\-]+)/i);
      let extractedStudentId = idMatch ? idMatch[1] : undefined;

      if (extractedStudentId && !submission.studentRegNo) {
          await prisma.submission.update({
              where: { id: submissionId },
              data: { studentRegNo: extractedStudentId }
          });
          submission.studentRegNo = extractedStudentId; // Update local state to prevent false GHOST flagging later
      }

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

      // STAGE 2: COMBINED TEXT GRADING (HOLISTIC CONTEXT)
      const totalMarks = submission.workSession.totalMarks || 100;
      console.log(`[AI_GRADE] Starting Holistic Text-Only Grading for Submission ${submissionId}.`);

      let result: GradingResult;

      try {
          if (!process.env.DEEPSEEK_API_KEY) {
              console.log(`[Simulator] Using DeepSeek Simulator`);
              const sim = await simulateDeepSeekCall(rawText);
              result = {
                  totalScore: sim.score,
                  breakdown: sim.breakdown.map((b: any) => ({
                      question_id: b.question_id,
                      score: b.score,
                      short_evidence: "SIMULATED_SNIPPET"
                  })),
                  confidence: sim.confidence,
                  detectedIdentity: extractedStudentId || "SIMULATED_ID"
              };
          } else {
              result = await gradeSubmission(
                  rawText,
                  rubricContent,
                  totalMarks,
                  config,
                  undefined, // Force text-only to avoid context overflow with images
                  undefined
              );
              console.log(`[AI_SUCCESS] Graded. Score: ${result.totalScore}/${totalMarks}`);
          }
      } catch (gradingError: any) {
          console.error(`[AI_GRADING_ERROR] Failed to grade holistic text:`, gradingError.message);
          throw new Error(`Holistic Grading Failed: ${gradingError.message}`);
      }

      if (!result.breakdown || !Array.isArray(result.breakdown)) {
          throw new Error("Invalid AI Result: Missing or malformed breakdown array");
      }

      // 4. Transform Diet JSON for Database (Schema Compatibility)
      // The DB JSON expects fields like 'mappedRubricQuestion', 'isRelevant', 'evidenceSnippet'
      const formattedBreakdown = result.breakdown.map(item => ({
          isRelevant: true, // Legacy compatibility: assume all diet items are relevant
          mappedRubricQuestion: item.question_id,
          question: item.question_id,
          score: item.score,
          max: item.score, // Fallback since diet doesn't return max
          feedback: item.short_evidence,
          evidenceSnippet: item.short_evidence
      }));

      // SILENT FILTERING: Remove irrelevant metadata/noise chunks before saving to DB
      let validBreakdowns = formattedBreakdown.filter(item => item.isRelevant !== false);

      let aggregatedScore = 0;
      validBreakdowns.forEach(item => {
          aggregatedScore += item.score;
      });

      const aggregatedConfidence = result.confidence ?? 95;
      const aggregatedReasoning = "Holistic grading completed via Diet JSON.";
      const aggregatedIdentity = extractedStudentId || result.detectedIdentity || "UNIDENTIFIED_IDENTITY";

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
        strengths: [],
        weaknesses: [],
        improvement: "Review holistic feedback for details."
      });

      await prisma.submission.update({
        where: { id: submission.id },
        data: {
          status,
          confidenceScore: aggregatedConfidence,
          feedback: feedbackStr
        }
      });

// Helper: Keep your existing URL downloading / caching logic here
async function getOrExtractText(urlOrText: string | null): Promise<string> {
    if (!urlOrText) return "None";

    // If it's a Supabase file path
    if (urlOrText.includes('/') || urlOrText.toLowerCase().endsWith('.pdf')) {
        try {
            const buffer = await readFile(urlOrText, 'exam_pdfs');
            const mimeType = urlOrText.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';
            return await ocrDocument(buffer, mimeType);
        } catch (e) {
            console.error("Failed to extract text from URL:", e);
            return "Failed to extract.";
        }
    }

    return urlOrText; // Return as-is if it's already raw text
}