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
        const systemPrompt = `You are a strict, elite academic grader at a university level.

YOUR MANDATE:
1. IDENTITY HUNT: Extract the student's Registration Number. If missing, output "UNKNOWN".
2. SEMANTIC MATCHING TIERS: You MUST evaluate the student's text against the Marking Scheme using these exact NLP semantic tiers:
   - [Same As]: The student's answer semantically matches the rubric point (even if paraphrased). Award full marks.
   - [Partial Match]: The student touched on the core concept but missed key details required by the rubric. Award partial marks.
   - [Out of Scope]: The student provided information that is irrelevant to the rubric or question. Award 0 marks for this point.
   - [Contradiction / Incorrect]: The student's answer directly opposes the rubric or is factually wrong. Award 0 marks.
3. GRANULARITY: Grade strictly against the MARKING SCHEME. Do not invent marks.

STRICT JSON SCHEMA MANDATE:
You must return ONLY valid JSON matching this exact structure. Do not use markdown blockquotes.

{
  "regNo": "String",
  "totalScore": Number (Sum of all awarded scores),
  "aiFeedback": "String (A detailed, 3-paragraph summary covering Strengths, Weaknesses, and Improvements)",
  "breakdown": [
    {
      "question": "String (e.g., Q1A i)",
      "score": Number (Marks awarded),
      "max": Number (Maximum possible marks for this question based on the rubric),
      "feedback": "String (Start with the Semantic Tier. Example: '[Partial Match] The student correctly defined X, but missed Y. [Out of Scope] The explanation of Z was irrelevant.')"
    }
  ]
}`;

        // 3. Native DeepSeek Call
        const completion = await deepSeekClient.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `MARKING SCHEME:\n${actualRubric}\n\nSTUDENT EXAM:\n${fullExamText}` }
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
            console.error("[JSON PARSE ERROR]", error);
            throw new Error("AI returned invalid JSON");
        }

        // ATOMIC DATABASE UPDATE
        await prisma.score.create({
            data: {
                submissionId: submission.id,
                totalMarks: resultData.totalScore || 0,
                remarks: resultData.aiFeedback || "No general feedback generated.", // Map aiFeedback to remarks for Prisma
                breakdown: JSON.stringify(resultData.breakdown || []), // Perfectly matches UI Contract!
                detectedIdentity: resultData.regNo || "UNKNOWN"
            }
        });

        await prisma.submission.update({
            where: { id: submission.id },
            data: { status: 'GRADED' }
        });

        console.log(`[REDUCER] Successfully graded submission ${submission.id}. Reg: ${resultData.regNo}`);
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