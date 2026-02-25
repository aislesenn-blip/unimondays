import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth';
import { storage } from '@/lib/storage';

export async function POST(req: NextRequest) {
  const user = await validateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string || 'exam_pdfs'; // Default bucket
    const folder = formData.get('folder') as string || 'uploads';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type (basic)
    if (!file.type.startsWith('application/pdf') && !file.type.startsWith('image/')) {
       return NextResponse.json({ error: 'Invalid file type. Only PDF and Images allowed.' }, { status: 400 });
    }

    // Upload to Storage
    // The storage service handles bucket selection or path prefixing
    // SupabaseStorageService uses 'exam_pdfs' as default bucket but supports folder prefixes.
    // TmpStorageService ignores bucket but uses folder.

    // We pass bucket/folder info. Since StorageService interface is generic (folder only),
    // we assume 'folder' is the key path.
    // For Supabase, path = `${folder}/${filename}` inside bucket `exam_pdfs`.
    // If bucket is `feedback_exports`, we handle it in service logic or modify service.

    // Let's assume standard uploads go to 'exam_pdfs'.
    const path = await storage.uploadFile(file, folder);

    // Return the path (or signed URL if needed, but path is safer for DB ref)
    return NextResponse.json({ path });
  } catch (error: any) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
