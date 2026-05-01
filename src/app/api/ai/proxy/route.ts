import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  // Ensure the user is authenticated to prevent public abuse of the API proxy
  const user = await validateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server" }, { status: 500 });
  }

  try {
    const body = await request.json();

    // Proxy the request directly to the Google Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
