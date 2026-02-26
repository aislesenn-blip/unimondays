import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch file');

    const blob = await response.blob();
    const headers = new Headers();

    // Determine filename
    let filename = 'document.pdf';
    const pathParts = url.split('/');
    const possibleName = pathParts[pathParts.length - 1];
    if (possibleName) {
        // Remove UUID prefix if present
        filename = possibleName.substring(possibleName.indexOf('-') + 1) || possibleName;
    }

    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Content-Type', blob.type);

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error("Download Proxy Error:", error);
    return new NextResponse('Download failed', { status: 500 });
  }
}
