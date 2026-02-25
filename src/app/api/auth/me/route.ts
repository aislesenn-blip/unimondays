import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await validateRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return full user object including university (validateRequest includes it)
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Auth Me Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
