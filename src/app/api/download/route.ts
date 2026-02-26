import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Uses service role key
import { validateRequest } from '@/lib/auth'; // Ensure only authenticated users can access

export async function GET(req: NextRequest) {
  // --- AUTHENTICATION CHECK ---
  // Mandatory: Only authenticated users (Students or Lecturers) can download files via this proxy.
  const user = await validateRequest(req);
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const url = req.nextUrl.searchParams.get('url');
  const inline = req.nextUrl.searchParams.get('inline') === 'true';

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    let blob: Blob;
    let filename = 'document.pdf';
    let contentType = 'application/pdf';
    let bucket = 'exam_pdfs'; // Default bucket
    let storagePath = url;

    // --- SSRF PREVENTION & PATH RESOLUTION ---
    // If it's a full URL, we MUST validate it belongs to our Supabase instance.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (url.startsWith('http://') || url.startsWith('https://')) {
        if (!supabaseUrl || !url.startsWith(supabaseUrl)) {
            // Strict Check: Block requests to arbitrary domains (SSRF prevention)
            return new NextResponse('Invalid file origin', { status: 403 });
        }

        // Extract path from Supabase URL
        // Example: https://xyz.supabase.co/storage/v1/object/public/exam_pdfs/folder/file.pdf
        // We need: folder/file.pdf
        // We also need to identify the bucket from the URL if possible, or assume based on path segments.
        // Standard Supabase URL format: .../storage/v1/object/public/{bucket}/{path}

        try {
            const urlObj = new URL(url);
            // Splitting path: /storage/v1/object/public/exam_pdfs/folder/file.pdf
            const pathParts = urlObj.pathname.split('/');
            // Find where 'public' or 'sign' (if private) is, then next part is bucket, then path.
            // Simplified: We know our buckets.
            if (urlObj.pathname.includes('/exam_pdfs/')) {
                bucket = 'exam_pdfs';
                storagePath = urlObj.pathname.split('/exam_pdfs/')[1];
            } else if (urlObj.pathname.includes('/feedback_exports/')) {
                bucket = 'feedback_exports';
                storagePath = urlObj.pathname.split('/feedback_exports/')[1];
            } else {
                 // Fallback: If we can't determine bucket securely from URL, we reject.
                 // Or we could try to just use the end of the path? No, safer to be explicit.
                 return new NextResponse('Unknown storage bucket', { status: 400 });
            }
        } catch (e) {
            return new NextResponse('Invalid URL format', { status: 400 });
        }
    } else {
        // --- RELATIVE PATH HANDLING ---
        // Assume 'exam_pdfs' unless path suggests otherwise (e.g. feedback/)
        if (url.startsWith('feedback')) bucket = 'feedback_exports';
        storagePath = url; // It's already a relative path
    }

    // Clean path (remove leading slash if present)
    if (storagePath.startsWith('/')) storagePath = storagePath.substring(1);

    // --- DOWNLOAD VIA SERVICE ROLE ---
    // We use the service role client (imported as 'supabase') to bypass RLS.
    // This is safe because we performed the application-level Auth check above (validateRequest).
    const { data, error } = await supabase.storage.from(bucket).download(storagePath);

    if (error) {
        console.error(`Supabase Download Error (${bucket}/${storagePath}):`, error);
        return new NextResponse('File not found', { status: 404 });
    }

    blob = data as Blob;

    // --- METADATA & HEADERS ---

    // Derive filename from path
    const pathParts = storagePath.split('/');
    const possibleName = pathParts[pathParts.length - 1];
    if (possibleName) {
            // Remove UUID prefix if present (common pattern: uuid-filename)
            const hasUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(possibleName);
            filename = hasUuid ? possibleName.substring(possibleName.indexOf('-') + 1) : possibleName;
    }

    // Infer content type
    if (filename.endsWith('.png')) contentType = 'image/png';
    else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (filename.endsWith('.zip')) contentType = 'application/zip';

    // Sanitize filename
    filename = filename.replace(/["\\]/g, '_');

    const headers = new Headers();
    const disposition = inline ? 'inline' : 'attachment';
    headers.set('Content-Disposition', `${disposition}; filename="${filename}"`);
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour, private because it's auth-protected

    return new NextResponse(blob, { headers });

  } catch (error) {
    console.error("Download Proxy Error:", error);
    return new NextResponse('Download failed', { status: 500 });
  }
}
