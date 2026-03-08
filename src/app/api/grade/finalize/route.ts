import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { readFile } from '@/lib/storage';
import { ocrDocument } from '@/lib/ai/gemini';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// STRICT: Must be Native DeepSeek API, not OpenRouter.
const deepSeekClient = new OpenAI({ baseURL: "https://api.deepseek.com", apiKey: process.env.DEEPSEEK_API_KEY || 'dummy' });

export async function POST(req: NextRequest) {
    try {
        const { submissionId } = await req.json();

        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            include: { workSession: true }
        });

        if (!submission) throw new Error("Submission not found");

        let finalRubricText = submission.workSession.rubric;

        // 2. THE SELF-HEALING CACHE
        if ((!finalRubricText || finalRubricText.trim().length === 0) && submission.workSession.markingScheme) {
            console.log("[ARCHITECTURE] Missing Rubric Text. Extracting from PDF URL...");

            try {
                // Fetch the PDF from submission.workSession.markingScheme
                const buffer = await readFile(submission.workSession.markingScheme, 'exam_pdfs');
                const mimeType = submission.workSession.markingScheme.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';
                const extractedText = await ocrDocument(buffer, mimeType);

                finalRubricText = extractedText;

                // PERMANENTLY CACHE IT: Save it back to the WorkSession!
                // The next 500 students will skip this entire extraction block.
                await prisma.workSession.update({
                    where: { id: submission.workSession.id },
                    data: { rubric: finalRubricText }
                });
                console.log("[ARCHITECTURE] Rubric successfully extracted and cached!");

            } catch (error) {
                console.error("[CRITICAL] Failed to extract Rubric PDF:", error);
                throw new Error("Rubric Extraction Failed");
            }
        }

        // 3. HARD STOP IF STILL EMPTY
        if (!finalRubricText || finalRubricText.trim().length === 0) {
            console.error("[CRITICAL] No Rubric or Marking Scheme found. Halting grading.");
            await prisma.submission.update({
                where: { id: submission.id },
                data: { status: 'FAILED', feedback: 'Missing Marking Scheme' }
            });
            throw new Error("Fatal: Rubric text is entirely missing. Cannot grade.");
        }

        // 1. Sort the chaotic chunks back into logical page order
        const sortedData = (submission.extractedData as any[])
            .sort((a, b) => a.pages[0] - b.pages[0]);

        const fullExamText = sortedData.map(chunk => `[PAGES ${chunk.pages.join(',')}]\n${chunk.text}`).join('\n\n');

        // 2. The Chaos Hunter Prompt (Precision Engineering)
        const systemPrompt = `You are an elite, empathetic academic professor grading a university exam.
You are evaluating a student's scanned, OCR-extracted exam against a strict Marking Scheme.

YOUR MANDATORY DIRECTIVES:
1. ANTI-LAZINESS (CRITICAL): The student's text is messy, out of order, or missing question numbers. DO NOT blindly output "Skipped question". You MUST semantically scan the ENTIRE student text for concepts, formulas, or keywords matching the rubric. Grade based on meaning, not layout.
2. EMPATHETIC TONE: Speak directly to the student in your feedback (e.g., "You showed a great understanding of X..."). Do NOT use internal robotic language like "I graded holistically" or "mapped to rubric".
3. SEMANTIC TIERS: Every question's feedback MUST start with one of these exact NLP tags:
   - [Exact Match]: Concept perfectly aligns with the rubric.
   - [Partial Match]: Concept is touched upon but missing key rubric details.
   - [Out of Scope]: Concept is irrelevant or factually incorrect.
   - [Missing]: The concept was truly nowhere to be found in the entire exam text.
4. NO MATH: Do NOT calculate the total score. The backend system will calculate it. Just provide the individual scores.

STRICT JSON SCHEMA MANDATE:
You must return ONLY valid JSON matching this EXACT structure. The frontend UI crashes if you deviate.

{
  "regNo": "String (Extract student registration number, or 'UNKNOWN')",
  "aiFeedback": "String (A 3-paragraph, student-facing, encouraging summary of their strengths, weaknesses, and areas for improvement.)",
  "overallRemarks": "String (A single, highly encouraging closing sentence to the student.)",
  "breakdown": [
    {
      "question": "String (e.g., Q1A i)",
      "score": Number (Marks awarded),
      "max": Number (Maximum possible marks based on the rubric. MUST use the key 'max', NOT 'maxScore'),
      "feedback": "String (Must start with the Semantic Tier tag, followed by a detailed explanation. e.g., '[Partial Match] You correctly identified X, but missed Y.')"
    }
  ]
}`;

        // 3. Native DeepSeek Call
        const completion = await deepSeekClient.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `MARKING SCHEME:\n${finalRubricText}\n\nSTUDENT EXAM:\n${fullExamText}` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.0,
        });

        // 4. BULLETPROOF PARSING & DB MAPPING
        let rawContent = completion.choices[0]?.message?.content || '{}';
        const cleanJsonString = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();

        let resultData;
        try {
            const jsonMatch = cleanJsonString.match(/\{[\s\S]*\}/);
            resultData = JSON.parse(jsonMatch ? jsonMatch[0] : cleanJsonString);
        } catch (error) {
            console.error("[JSON PARSE ERROR] AI returned malformed JSON:", error);
            throw new Error("AI returned invalid JSON");
        }

        // 1. SAFEGUARD: Force UI Contract Mapping
        // If the AI stubborn outputs 'maxScore', map it to 'max' for the UI.
        const formattedBreakdown = (resultData.breakdown || []).map((item: any) => ({
            question: item.question || "Unknown",
            score: Number(item.score) || 0,
            max: Number(item.max || item.maxScore) || 0,
            feedback: item.feedback || "No feedback provided."
        }));

        // 2. ABSOLUTE MATH ACCURACY: Calculate total in backend, not AI.
        const calculatedTotalScore = formattedBreakdown.reduce((sum: number, item: any) => sum + item.score, 0);

        // 3. ATOMIC DATABASE UPDATE
        await prisma.score.create({
            data: {
                submissionId: submission.id,
                totalMarks: calculatedTotalScore, // <--- Using exact Node.js math
                remarks: resultData.aiFeedback || "Grading completed.",
                breakdown: JSON.stringify(formattedBreakdown), // <--- Perfectly mapped for the UI!
                detectedIdentity: resultData.regNo || "UNKNOWN"
            }
        });

        // Add the remarks to the submission or score if your schema supports it
        await prisma.submission.update({
            where: { id: submission.id },
            data: {
                status: 'GRADED',
                // Map the overall closing sentence to feedback
                feedback: resultData.overallRemarks || null
            }
        });

        console.log(`[PRODUCTION] Grading Complete. Calculated Score: ${calculatedTotalScore}. Reg: ${resultData.regNo}`);
        return NextResponse.json({ success: true, regNo: resultData.regNo });

    } catch (error: any) {
        console.error(`[REDUCER FATAL ERROR]:`, error);
        const { submissionId } = await req.json().catch(()=>({}));
        if(submissionId) {
            await prisma.submission.update({ where: { id: submissionId }, data: { status: 'FAILED', feedback: error.message } });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}