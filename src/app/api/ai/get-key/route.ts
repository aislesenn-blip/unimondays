import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  // Ensure the user is authenticated
  const user = await validateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server" }, { status: 500 });
  }

  return NextResponse.json({ key });
}
