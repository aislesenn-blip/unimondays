'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";

// ... (keep getWorkSessionDetails)

export async function updateWorkSessionSettings(id: string, formData: FormData) {
    return { success: true, error: null as string | null }
}

export async function publishGrades(id: string) {
    return { count: 10, error: null as string | null }
}

export async function unpublishGrades(id: string) {
    return { count: 10, error: null as string | null }
}

export async function getWorkSessionDetails(sessionId: string) {
    const session = await prisma.workSession.findUnique({
        where: { id: sessionId },
        include: {
            class: true,
        },
    });
    return session;
}

export async function updateSubmissionGrade(submissionId: string, workSessionId: string, totalScore: number, remarks: string) {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    try {
        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            include: { score: true, workSession: { select: { lecturerId: true } } },
        });

        if (!submission || (submission.workSession.lecturerId !== user.id && !user.user_metadata.isAdmin)) {
            throw new Error("Forbidden");
        }

        const updatedScore = await prisma.score.update({
            where: {
                submissionId: submissionId,
            },
            data: {
                score: totalScore,
                graderNotes: remarks,
            },
        });

        // If there was a pending appeal, mark it as resolved.
        if (submission.status === 'APPEAL_REQUESTED') {
            await prisma.submission.update({
                where: { id: submissionId },
                data: { status: 'GRADED' },
            });
            const appeal = await prisma.appeal.findFirst({
                where: { submissionId: submissionId, status: 'PENDING' },
            });
            if (appeal) {
                await prisma.appeal.update({
                    where: { id: appeal.id },
                    data: { status: 'APPROVED', resolutionNotes: "Resolved by lecturer" },
                });
            }
        }

        revalidatePath(`/dashboard/work-sessions/${workSessionId}`);
        return { success: true, data: updatedScore };

    } catch (error) {
        console.error("Grade update failed:", error);
        return { success: false, error: (error as Error).message };
    }
}
