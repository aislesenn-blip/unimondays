
import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { performOcr } from '@/lib/ai/gemini';

export async function POST(req: NextRequest) {
  try {
    const user = await validateRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'LECTURER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only Lecturers can use OCR for Rubrics.' }, { status: 403 });
    }

    const body = await req.json();
    const { filePath, bucket } = body;

    if (!filePath) {
      return NextResponse.json({ error: 'Missing filePath' }, { status: 400 });
    }

    // Read file from storage
    // If bucket is not provided, storage.readFile defaults to 'exam_pdfs'
    const buffer = await storage.readFile(filePath, bucket);

    if (!buffer) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Perform OCR
    let mimeType = 'application/pdf';
    if (filePath.toLowerCase().endsWith('.png')) mimeType = 'image/png';
    else if (filePath.toLowerCase().endsWith('.jpg') || filePath.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';

    // Call Gemini OCR
    const text = await performOcr(buffer, mimeType);

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("OCR API Error:", error);
    return NextResponse.json({ error: error.message || 'OCR failed' }, { status: 500 });
  }
}
