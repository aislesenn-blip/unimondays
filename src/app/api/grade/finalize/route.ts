import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

// STRICT: Must be Native DeepSeek API, not OpenRouter.
const deepSeekClient = new OpenAI({ baseURL: "https://api.deepseek.com", apiKey: process.env.DEEPSEEK_API_KEY || 'dummy' });
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const { submissionId } = await req.json();

        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            include: { workSession: true }
        });

        if (!submission) throw new Error("Submission not found");

        // 1. Sort the chaotic chunks back into logical page order
        const sortedData = (submission.extractedData as any[])
            .sort((a, b) => a.pages[0] - b.pages[0]);

        const fullExamText = sortedData.map(chunk => `[PAGES ${chunk.pages.join(',')}]\n${chunk.text}`).join('\n\n');

        // 2. The Chaos Hunter Prompt (Precision Engineering)
        const systemPrompt = `You are a strict, expert academic grader. The following text is raw, chaotic, and assembled from multiple scanned pages of a student's exam.

YOUR MANDATE:
1. IDENTITY HUNT: First, hunt for the student's Registration Number or Name. If missing, output "UNKNOWN_STUDENT".
2. HOLISTIC GRADING: Grade strictly against the marking scheme. Do not penalize for answers written out of order or on the wrong page. Find the answer wherever it is.
3. PERSONALIZED REMARKS: Provide detailed, accurate, and personalized feedback for each question explaining exactly why marks were awarded or lost.
4. STRICT JSON FORMAT: You MUST return ONLY this exact JSON structure. Do not wrap it in markdown block quotes.
{
  "reg_no": "String",
  "total_score": Number,
  "results": [
    {"q": "QuestionNum", "score": Number, "remark": "String"}
  ]
}`;

        // 3. Native DeepSeek Call
        const completion = await deepSeekClient.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `MARKING SCHEME:\n${submission.workSession.rubric}\n\nSTUDENT EXAM:\n${fullExamText}` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.0,
        });

        let rawContent = completion.choices[0]?.message?.content || '{}';

        // Extract JSON strictly between first { and last } to avoid Markdown/Conversational wrap
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            rawContent = jsonMatch[0];
        }

        const resultData = JSON.parse(rawContent);

        // 4. Atomic Database Finalization
        await prisma.score.create({
            data: {
                submissionId: submission.id,
                totalMarks: resultData.total_score || 0,
                breakdown: JSON.stringify(resultData.results || []),
                detectedIdentity: resultData.reg_no || "UNKNOWN"
            }
        });

        await prisma.submission.update({
            where: { id: submission.id },
            data: { status: 'GRADED' }
        });

        console.log(`[REDUCER] Successfully graded submission ${submission.id}. Reg: ${resultData.reg_no}`);
        return NextResponse.json({ success: true, regNo: resultData.reg_no });

    } catch (error: any) {
        console.error(`[REDUCER FATAL ERROR]:`, error);
        const { submissionId } = await req.json().catch(()=>({}));
        if(submissionId) {
            await prisma.submission.update({ where: { id: submissionId }, data: { status: 'FAILED' } });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}