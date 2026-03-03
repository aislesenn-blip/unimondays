'use server';

import { db } from "@/lib/db";
import { unstable_noStore as noStore } from 'next/cache';

/**
 * Fetches all submissions for a given work session, including related student and score data.
 * Results are sorted by submission date in descending order.
 * @param workSessionId The ID of the work session.
 * @returns A promise that resolves to an array of submissions.
 */
export async function getSubmissionsForSession(workSessionId: string) {
  noStore(); // Ensures fresh data on every fetch, crucial for the live table.
  
  try {
    const submissions = await db.submission.findMany({
      where: {
        workSessionId: workSessionId,
      },
      include: {
        student: true, // Include the related User model via the 'student' relation. Renamed from student.
        score: true,   // Include the related Score
        appeals: {     // Include any appeals
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });
    return submissions;
  } catch (error) {
    console.error("Database Error: Failed to fetch submissions.", error);
    // Return an empty array in case of an error to prevent the page from crashing.
    return [];
  }
}
