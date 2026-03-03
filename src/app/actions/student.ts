'use server';

import { prisma } from "@/lib/prisma";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { processSubmission } from './grading'; // Import the new background processor

export async function verifyWorkCode(code: string) {
  try {
    const workSession = await prisma.workSession.findUnique({
      where: { workCode: code },
      include: {
        class: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!workSession) {
      return { error: "Invalid work code." };
    }

    return {
      success: true,
      workSession: {
        id: workSession.id,
        title: workSession.title,
        deadline: workSession.deadline,
        className: workSession.class.name,
      },
    };
  } catch (error) {
    return { error: "An error occurred while verifying the code." };
  }
}

export async function submitAssignment(formData: FormData) {
    const supabase = createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "You must be logged in to submit an assignment." };
    }

    const workSessionId = formData.get('workSessionId') as string;
    const studentFile = formData.get('studentFile') as File;

    if (!workSessionId || !studentFile) {
        return { error: "Missing work session ID or file." };
    }

    const filePath = `submissions/${workSessionId}/${user.id}/${studentFile.name}`;

    const { error: uploadError } = await supabase.storage
        .from('submissions_bucket')
        .upload(filePath, studentFile);

    if (uploadError) {
        console.error("Storage Error:", uploadError);
        return { error: "Failed to upload submission file." };
    }

    try {
        const newSubmission = await prisma.submission.create({
            data: {
                studentId: user.id,
                workSessionId,
                fileUrl: filePath,
                status: 'PENDING_UPLOAD',
            },
        });

        // FIRE-AND-FORGET: Trigger background grading without awaiting
        processSubmission(newSubmission.id);

        revalidatePath(`/quiz`);

        return { success: true };
    } catch (e) {
        console.error("Prisma Error:", e);
        return { error: "Failed to create submission record." };
    }
}
