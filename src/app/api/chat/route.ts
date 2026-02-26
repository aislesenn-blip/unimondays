import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 60; // Allow 60s for chat response

const deepseek = process.env.DEEPSEEK_API_KEY
  ? new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    })
  : null;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    if (!deepseek) {
      console.error("[CHAT] DEEPSEEK_API_KEY is missing.");
      return NextResponse.json({
        error: "Configuration Error",
        details: "AI Service is not configured (Missing API Key)."
      }, { status: 503 });
    }

    // High-Performance System Prompt
    const systemMessage = {
      role: "system",
      content: `You are the Playbook AI Assistant, an expert educational consultant.
      Your goal is to help lecturers with grading, assessment design, and student performance analysis.
      Be concise, professional, and helpful.
      Do not hallucinate data. If you don't know something, ask for clarification.
      `
    };

    // Filter valid roles (user, assistant, system)
    const validMessages = messages.filter(m => ['user', 'assistant', 'system'].includes(m.role));

    console.log(`[CHAT] Sending ${validMessages.length} messages to DeepSeek...`);

    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat", // V3 is faster than R1 (reasoner)
      messages: [systemMessage, ...validMessages],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const reply = completion.choices[0].message.content;

    return NextResponse.json({ content: reply });

  } catch (error: any) {
    // VERBOSE ERROR LOGGING (The Fix)
    console.error("[CHAT] Fatal Error:", error);

    // Check for specific provider errors
    if (error.status === 401) {
       console.error("[CHAT] API Key Invalid.");
       return NextResponse.json({ error: "Authentication Error", details: "Invalid AI API Key." }, { status: 401 });
    }
    if (error.status === 429) {
       console.error("[CHAT] Rate Limit Exceeded.");
       return NextResponse.json({ error: "Rate Limit", details: "AI is busy. Please try again later." }, { status: 429 });
    }

    // Return detailed error to client for debugging (in dev/admin view) or generic for user
    // The prompt asked to "expose the actual provider error" for the CTO.
    return NextResponse.json({
        error: "AI Processing Failed",
        details: error.message || "Unknown upstream error",
        provider_error: error.response?.data || error.code
    }, { status: 500 });
  }
}
