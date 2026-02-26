import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { uploadFile } from '@/lib/storage';

// Magic Number Signatures
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF
const JPEG_MAGIC = [0xFF, 0xD8, 0xFF];
const PNG_MAGIC = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

async function validateFileSignature(file: File): Promise<boolean> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 8)); // Read first 8 bytes

    const check = (magic: number[]) => magic.every((byte, i) => bytes[i] === byte);

    return check(PDF_MAGIC) || check(JPEG_MAGIC) || check(PNG_MAGIC);
  } catch (e) {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate (Robust)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth-session');

    if (!sessionCookie) {
         return NextResponse.json({ error: 'Unauthorized: No session found' }, { status: 401 });
    }

    let session;
    try {
        session = JSON.parse(sessionCookie.value);
    } catch (e) {
        return NextResponse.json({ error: 'Unauthorized: Invalid session' }, { status: 401 });
    }

    const userId = session.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    // 2. Parse Form Data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const workSessionId = formData.get('workSessionId') as string;

    if (!file || !workSessionId) {
        return NextResponse.json({ error: 'Missing file or work session ID' }, { status: 400 });
    }

    // 3. Security: Rate Limiting (Throttling)
    const lastSubmission = await prisma.submission.findFirst({
        where: {
            userId,
            workSessionId // Rate limit per assignment
        },
        orderBy: { submittedAt: 'desc' },
        select: { submittedAt: true }
    });

    if (lastSubmission?.submittedAt) {
        const timeSince = Date.now() - new Date(lastSubmission.submittedAt).getTime();
        const COOLDOWN_MS = 30 * 1000; // 30 Seconds Cooldown
        if (timeSince < COOLDOWN_MS) {
             const waitSeconds = Math.ceil((COOLDOWN_MS - timeSince) / 1000);
             return NextResponse.json(
                { error: `Please wait ${waitSeconds}s before resubmitting.` },
                { status: 429 }
             );
        }
    }

    // 4. Security: File Validation (Magic Bytes & MIME)
    const validMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validMimes.includes(file.type)) {
        return NextResponse.json({ error: 'Invalid file type. Only PDF, JPG, and PNG are allowed.' }, { status: 400 });
    }

    const isValidSignature = await validateFileSignature(file);
    if (!isValidSignature) {
        console.warn(`Security Block: User ${userId} attempted to upload malformed file: ${file.name}`);
        return NextResponse.json({ error: 'Security Warning: File signature verification failed. Please upload a valid standard file.' }, { status: 400 });
    }

    // 5. Verify Work Session & Deadline
    const workSession = await prisma.workSession.findUnique({
        where: { id: workSessionId }
    });

    if (!workSession) {
        return NextResponse.json({ error: 'Invalid Work Session' }, { status: 404 });
    }

    if (workSession.deadline && new Date() > workSession.deadline) {
        return NextResponse.json({ error: 'Deadline has passed.' }, { status: 403 });
    }

    // 6. Upload File (Securely)
    // LocalStorageService or SupabaseStorageService will handle the actual writing
    const fileUrl = await uploadFile(file, 'submissions');

    // 7. Create or Update Submission (Idempotent)
    const existingSubmission = await prisma.submission.findUnique({
        where: {
            workSessionId_userId: {
                workSessionId,
                userId
            }
        }
    });

    let submission;
    if (existingSubmission) {
        // Update existing submission
        submission = await prisma.submission.update({
            where: { id: existingSubmission.id },
            data: {
                filePath: fileUrl,
                status: 'PENDING',
                submittedAt: new Date(),
                ocrText: null, // Reset OCR if re-submitting
                feedback: null
            }
        });
        // Clear old scores to trigger re-grading
        await prisma.score.deleteMany({ where: { submissionId: submission.id } });
    } else {
        submission = await prisma.submission.create({
            data: {
                workSessionId,
                userId,
                studentName: session.email, // Best effort fallback
                filePath: fileUrl,
                status: 'PENDING'
            }
        });
    }

    // 8. Trigger AI Grading Worker
    await prisma.job.create({
        data: {
            type: 'AI_GRADE',
            payload: JSON.stringify({ submissionId: submission.id }),
            status: 'PENDING'
        }
    });

    return NextResponse.json({ success: true, submissionId: submission.id });

  } catch (error: any) {
    console.error("Submit Error:", error);
    // Return generic error to client, log specific error on server
    return NextResponse.json({ error: 'Submission failed due to an internal error. Please try again.' }, { status: 500 });
  }
}
