import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  // Ensure the user is authenticated to prevent public abuse of the API proxy
  const user = await validateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY is not configured on the server" }, { status: 500 });
  }

  try {
    const body = await request.json();

    // Proxy the request directly to OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': 'https://playbook.app',
        'X-Title': 'Playbook Grading Engine'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
        return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
