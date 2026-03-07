import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const deepseek = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY || 'missing-key',
});

export const maxDuration = 60; // Allow 60 seconds for chat completions

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate (Omniscient Context requires Identity)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth-session');

    if (!sessionCookie) {
         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let session;
    try {
        session = JSON.parse(sessionCookie.value);
    } catch (e) {
        return NextResponse.json({ error: "Invalid Session" }, { status: 401 });
    }

    const userId = session.userId;
    if (!userId) {
        return NextResponse.json({ error: "User ID Missing" }, { status: 401 });
    }

    const body = await req.json();
    const { messages, currentPath } = body;

    if (!messages || !Array.isArray(messages)) {
        return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    if (!deepseek) {
        return NextResponse.json({ error: "AI Service Configuration Error" }, { status: 503 });
    }

    // 2. Fetch Omniscient Context (RAG)
    // We fetch: Active Classes, WorkSessions, and Student Interactions
    console.log(`[CHAT] Fetching Context for Lecturer ${userId}`);

    const [classes, workSessions] = await Promise.all([
        prisma.classes.findMany({
            where: { lecturerId: userId },
            select: { name: true, code: true, status: true }
        }),
        prisma.workSession.findMany({
            where: { lecturerId: userId },
            orderBy: { createdAt: 'desc' },
            take: 10, // Limit to recent sessions to save tokens
            include: {
                submissions: {
                    select: {
                        id: true,
                        status: true,
                        studentName: true,
                        studentRegNo: true,
                        submittedAt: true,
                        score: {
                            select: { totalMarks: true }
                        },
                        user: {
                            select: { email: true, fullName: true }
                        }
                    }
                }
            }
        })
    ]);

    // 3. Synthesize Context Summary
    const classSummary = classes.map(c => `${c.code} (${c.name})`).join(", ");

    // Extract Unique Students & Session Stats
    const studentMap = new Map<string, any>();
    const sessionSummary = workSessions.map(ws => {
        const subCount = ws.submissions.length;
        const gradedCount = ws.submissions.filter(s => s.status === 'GRADED').length;
        const pendingCount = ws.submissions.filter(s => s.status === 'PENDING').length;
        const failedCount = ws.submissions.filter(s => s.status === 'FAILED' || s.status === 'FLAGGED').length;

        let totalScore = 0;
        let scoreCount = 0;

        ws.submissions.forEach(s => {
            // Track Student
            const email = s.user?.email || "Unknown";
            const name = s.user?.fullName || s.studentName || "Unknown";
            const id = s.user?.email || s.studentRegNo || s.studentName || "Unknown"; // specific key

            if (!studentMap.has(id)) {
                studentMap.set(id, { name, email, regNo: s.studentRegNo });
            }

            if (s.score?.totalMarks !== undefined) {
                totalScore += s.score.totalMarks;
                scoreCount++;
            }
        });

        const avgScore = scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : "N/A";

        return `- ${ws.title} (${ws.workCode}): ${subCount} Subs (${gradedCount} Graded, ${pendingCount} Pending). Avg Score: ${avgScore}`;
    }).join("\n");

    const studentSummary = Array.from(studentMap.values())
        .map(s => `- ${s.name} (${s.email || "No Email"}) [${s.regNo || "No RegNo"}]`)
        .slice(0, 50) // Limit to 50 active students to save context
        .join("\n");

    const omniscientContext = `
Lecturer's Live Data Context:
CLASSES: ${classSummary || "None"}

RECENT SESSIONS:
${sessionSummary || "No recent sessions"}

KNOWN STUDENTS (Active in Submissions):
${studentSummary || "No active students found"}
    `;

    console.log(`[CHAT] Injected Context Length: ${omniscientContext.length} chars`);

    // 4. Construct System Prompt
    const systemMessage = {
        role: "system",
        content: `CRITICAL CONTEXT: The user is currently viewing the ${currentPath || "Unknown"} page.
You are the Playbook Omniscient Assistant. You have direct access to the Lecturer's classroom data and know exactly how the UI looks.
User's Name: ${session.fullName || "Lecturer"}.

${omniscientContext}

PLAYBOOK UI BLUEPRINT:
- The Sidebar is on the left. It contains navigation items like 'Home' and 'Cloud Marking'.
- 'Cloud Marking' is located specifically in the left sidebar, directly below 'Home'.
- Primary action buttons (like 'Create Class', 'New WorkSession', or 'Start Cloud Marking') are typically Blue and located either in the top-right corner of the content area or prominently centered.
- Status / Confidence Badges in tables are color-coded: Green (High Confidence/Graded), Yellow (Medium), Red (Low/Flagged).
- There are no visible sliders for "AI Flagging Threshold" in the current UI; this is handled automatically by the backend (85% default).

GUIDANCE RULE: When a user asks how to do something, DO NOT give generic advice. You must provide precise, spatial directions based on their currentPath and the UI Blueprint. Tell them exactly where to look on the screen, what color the button is, and what text it contains. Example Response: "Since you are on the Dashboard, look at the left sidebar just below 'Home', and click the 'Cloud Marking' button..."

DIRECTIVES:
1. Use the data above to answer specific questions about students, grades, and sessions.
2. If asked "Who hasn't submitted?", infer it by comparing expected students (if known) vs submissions, or state you only see those who *have* submitted.
3. Be concise, professional, and helpful.
4. If the data isn't in the context, say "I don't have that information handy."
5. Do NOT output JSON unless asked. Speak naturally.

MANDATE: CLOUD MARKING KNOWLEDGE
If the user asks about "Cloud Marking" or "Bulk Grading", explain the 4-step process:
1. SCAN: Scan all exams into a single PDF or folder.
2. UPLOAD: Upload to Google Drive/Dropbox/OneDrive.
3. LINK: Get a "Public View" link.
4. PROCESS: Paste the link in the "Cloud Marking" dashboard.
Then explain that you (the AI) will fetch, slice, grade, and organize the submissions automatically, allowing them to Sync matched students to their class roster or create a new class.
`
    };

    // Sanitize User Messages
    const safeMessages = messages.map((m: any) => ({
        role: ["system", "user", "assistant"].includes(m.role) ? m.role : "user",
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    }));

    const finalMessages = [systemMessage, ...safeMessages];

    // 5. Invoke DeepSeek
    const completion = await deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: finalMessages as any,
        temperature: 0.5, // Slightly lower for factual retrieval
        max_tokens: 1500,
        stream: false,
    });

    const content = completion.choices[0].message.content;

    if (!content) {
        return NextResponse.json({ error: "AI Provider returned empty response" }, { status: 502 });
    }

    return NextResponse.json({ content });

  } catch (error: any) {
    console.error("[CHAT_CRITICAL_FAILURE]", error);
    return NextResponse.json({
        error: "AI Processing Failed",
        details: error.message || "Unknown Error",
        providerError: error.status || "Client Error"
    }, { status: 500 });
  }
}
