'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

// ... (keep getWorkSessionDetails)

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
                totalMarks: totalScore,
                remarks: remarks,
                isEdited: true,
            },
        });

        // If there was a pending appeal, mark it as resolved.
        if (submission.status === 'APPEALED') {
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
                    data: { status: 'RESOLVED', resolvedById: user.id },
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
