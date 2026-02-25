import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/auth';

// Initialize DeepSeek
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || 'mock-key',
  baseURL: 'https://api.deepseek.com'
});

export async function POST(req: NextRequest) {
  try {
    const user = await validateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    // 1. Gather Context
    let context = "";

    if (user.role === 'LECTURER') {
      // Fetch recent grading activity
      const recentSubmissions = await prisma.submission.findMany({
        where: { quiz: { lecturerId: user.id }, status: 'GRADED' },
        take: 5,
        orderBy: { submittedAt: 'desc' },
        include: { quiz: true, score: true, user: true }
      });

      context = `
You are an expert Teaching Assistant for ${user.fullName}.
Recent Grading Context:
${recentSubmissions.map(s => `
- Student: ${s.user?.fullName || s.studentName} (${s.studentRegNo})
- Assessment: ${s.quiz.title}
- Score: ${s.score?.totalMarks}/${s.quiz.totalMarks}
- AI Remarks: ${s.score?.remarks}
`).join('\n')}
      `;
    } else if (user.role === 'STUDENT') {
      // Fetch student's recent results
      const myResults = await prisma.submission.findMany({
        where: { userId: user.id, status: 'GRADED' },
        take: 5,
        orderBy: { submittedAt: 'desc' },
        include: { quiz: true, score: true }
      });

      context = `
You are an academic tutor for ${user.fullName}.
Student's Recent Performance:
${myResults.map(s => `
- Assessment: ${s.quiz.title}
- Score: ${s.score?.totalMarks}/${s.quiz.totalMarks}
- Feedback: ${s.score?.remarks}
`).join('\n')}
      `;
    }

    // 2. System Prompt
    const systemPrompt = `
${context}

You are "Playbook AI", an intelligent assistant embedded in the university grading platform.
Your goal is to help the user understand their grades, performance, or grading tasks.
Be concise, professional, and helpful.
Refuse to answer non-academic questions or questions unrelated to the context.
    `;

    // 3. Call DeepSeek
    // Check if API Key is present, else mock
    if (!process.env.DEEPSEEK_API_KEY) {
       return NextResponse.json({
         role: 'assistant',
         content: "[Mock Response] I see you are asking about grades. Since the AI key is missing, I can't generate a real response, but I know who you are!"
       });
    }

    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
    });

    return NextResponse.json({
      role: 'assistant',
      content: completion.choices[0].message.content
    });

  } catch (error: any) {
    console.error("Chat Error:", error);
    return NextResponse.json({ error: "Failed to process chat" }, { status: 500 });
  }
}
