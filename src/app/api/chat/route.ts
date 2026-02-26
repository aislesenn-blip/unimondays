import { NextRequest, NextResponse } from "next/server";
import { deepseek } from "@/lib/ai/deepseek";

export const maxDuration = 60; // Allow 60 seconds for chat completions

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
        console.error("[CHAT_ERROR] Invalid payload structure. Expected 'messages' array.", body);
        return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    if (!deepseek) {
        console.error("[CHAT_ERROR] DeepSeek API Key is missing in environment variables.");
        return NextResponse.json({ error: "AI Service Configuration Error" }, { status: 503 });
    }

    // Sanitize and Format Messages
    const safeMessages = messages.map((m: any) => ({
        role: ["system", "user", "assistant"].includes(m.role) ? m.role : "user",
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    }));

    // System Persona
    const systemMessage = {
        role: "system",
        content: "You are the Playbook AI Assistant, an expert academic aide. Help lecturers with assessments, grading analytics, and student feedback. Be concise, professional, and helpful. Do not hallucinate data."
    };

    const finalMessages = [systemMessage, ...safeMessages];

    console.log(`[CHAT] Processing request with ${finalMessages.length} messages.`);

    const completion = await deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: finalMessages as any,
        temperature: 0.7,
        max_tokens: 2000, // Reasonable limit for chat
        stream: false, // Ensure we await full response to avoid complexity for now
    });

    const content = completion.choices[0].message.content;

    if (!content) {
        console.error("[CHAT_ERROR] Received empty content from DeepSeek API.");
        return NextResponse.json({ error: "AI Provider returned empty response" }, { status: 502 });
    }

    return NextResponse.json({ content });

  } catch (error: any) {
    console.error("[CHAT_CRITICAL_FAILURE]", error);

    // Deep Diagnostic Logging
    if (error.status) {
        console.error(`[CHAT_DIAGNOSTIC] Upstream Status Code: ${error.status}`);
    }
    if (error.error) {
         console.error(`[CHAT_DIAGNOSTIC] Upstream Error Details:`, error.error);
    }

    // Return specific error to client for debugging (as requested by "expose the actual provider error")
    return NextResponse.json({
        error: "AI Processing Failed",
        details: error.message || "Unknown Error",
        providerError: error.status || "Client Error"
    }, { status: 500 });
  }
}
