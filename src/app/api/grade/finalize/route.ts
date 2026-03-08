import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

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

        // FALLBACK CASCADE: Check all possible rubric fields
        const actualRubric = submission.workSession.rubric || submission.workSession.markingScheme || "";

        if (!actualRubric || actualRubric.trim().length === 0) {
            console.error("[CRITICAL] No Rubric or Marking Scheme found. Halting grading.");
            await prisma.submission.update({
                where: { id: submission.id },
                data: { status: 'FAILED', feedback: 'Missing Marking Scheme' } // Map gradingError to feedback for Prisma
            });
            return NextResponse.json({ error: "Missing Rubric" }, { status: 400 });
        }

        // 1. Sort the chaotic chunks back into logical page order
        const sortedData = (submission.extractedData as any[])
            .sort((a, b) => a.pages[0] - b.pages[0]);

        const fullExamText = sortedData.map(chunk => `[PAGES ${chunk.pages.join(',')}]\n${chunk.text}`).join('\n\n');

        // 2. The Chaos Hunter Prompt (Precision Engineering)
        const systemPrompt = `
You are an expert, strict, and highly analytical academic examiner. Your task is to grade a student's exam submission based ONLY on the provided Marking Guide (Rubric) and the raw extracted text (OCR) from the student's exam paper.

### INSTRUCTIONS:
1. **Holistic Scanning:** Scan the entire extracted text. Students may answer out of order or spill over pages. Match their answers to the corresponding questions in the Marking Guide.
2. **Granular Grading:** Grade each sub-question individually. Award full marks for complete answers, partial marks for incomplete but relevant answers, and 0 marks for skipped or completely wrong answers.
3. **Identity Extraction:** Locate the student's Registration Number (e.g., 2018-04-12551) from the text. If not found, use "UNKNOWN".
4. **Constructive Feedback:** Write a detailed overall feedback section explicitly categorized into "Strengths:", "Weaknesses:", and "Improvement:".
5. **Overall Remarks:** Provide a brief summary of how you conducted the grading (e.g., "I graded holistically, mapping scattered answers...").

CRITICAL SPEED CONSTRAINT:
You must return the JSON as fast as possible. Be extremely concise.
- "aiFeedback": Maximum TWO short sentences.
- "overallRemarks": Maximum ONE short sentence.
- "feedback" (inside breakdown): Maximum ONE short phrase (e.g., "Correct formula", "Skipped question", "Wrong definition"). DO NOT write paragraphs.

### STRICT OUTPUT FORMAT:
You MUST return ONLY a valid JSON object. Do not include markdown blockquotes (like \`\`\`json). Do not add any conversational text. The JSON MUST exactly match this schema:

{
  "regNo": "String (The extracted registration number)",
  "totalScore": Number (The sum of all awarded scores),
  "aiFeedback": "String (Must contain Strengths, Weaknesses, and Improvement)",
  "overallRemarks": "String (Summary of the grading process)",
  "breakdown": [
    {
      "question": "String (Question Number, e.g., Q1A i)",
      "score": Number (Awarded marks),
      "maxScore": Number (Maximum possible marks from rubric),
      "feedback": "String (Specific reason why this mark was awarded. E.g., 'Correct definition provided.')"
    }
  ]
}
`;

        // 3. Diagnostic Logs
        console.log("--- PAYLOAD SIZES ---");
        console.log("OCR Text Length:", fullExamText ? fullExamText.length : 0);
        console.log("Marking Guide Length:", submission.workSession.rubric ? submission.workSession.rubric.length : 0);

        // 4. Native DeepSeek Call
        const completion = await deepSeekClient.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `MARKING SCHEME:\n${actualRubric}\n\nSTUDENT EXAM:\n${fullExamText}` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.0,
        });

        let rawContent = completion.choices[0]?.message?.content || '{}';

        // 1. Log the RAW response so we can see it in Vercel
        console.log("====== RAW AI RESPONSE START ======");
        console.log(rawContent);
        console.log("====== RAW AI RESPONSE END ======");

        let resultData: any = {};

        // 2. Bulletproof Parsing
        try {
            // Strip markdown formatting if DeepSeek hallucinated it
            const cleanJsonString = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();

            // Find the first { and last } to avoid conversational text
            const jsonMatch = cleanJsonString.match(/\{[\s\S]*\}/);
            const finalStringToParse = jsonMatch ? jsonMatch[0] : cleanJsonString;

            resultData = JSON.parse(finalStringToParse);
            console.log("✅ SUCCESSFULLY PARSED JSON!");
        } catch (error) {
            console.error("❌ JSON PARSING FAILED. DeepSeek returned invalid JSON:", error);
        }

        // 3. Fallback Database Mapping (Catch all possible naming variations)
        await prisma.score.create({
            data: {
                submissionId: submission.id,
                totalMarks: resultData.totalScore || resultData.total_score || 0,
                remarks: resultData.overallRemarks || resultData.remarks || "No overall remarks provided.",
                breakdown: JSON.stringify(resultData.breakdown || resultData.results || []),
                detectedIdentity: resultData.regNo || resultData.reg_no || "UNKNOWN"
            }
        });

        await prisma.submission.update({
            where: { id: submission.id },
            data: {
                status: 'GRADED',
                feedback: resultData.aiFeedback || resultData.generalFeedback || "No AI feedback provided."
            }
        });

        console.log(`[REDUCER] Successfully graded submission ${submission.id}. Reg: ${resultData.regNo || resultData.reg_no}`);
        return NextResponse.json({ success: true, regNo: resultData.regNo || resultData.reg_no });

    } catch (error: any) {
        console.error(`[REDUCER FATAL ERROR]:`, error);
        const { submissionId } = await req.json().catch(()=>({}));
        if(submissionId) {
            await prisma.submission.update({ where: { id: submissionId }, data: { status: 'FAILED', feedback: error.message } });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}