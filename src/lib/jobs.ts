// src/lib/jobs.ts

/**
 * Fires a non-blocking POST request to the queue processor endpoint.
 * This is used to trigger background jobs without making the client wait.
 * @param jobId The ID of the job to process.
 */
export function triggerNextJob(jobId: string) {
  const queueProcessorUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/queue/process`;
  console.log(`TRIGGER: Firing async trigger for job: ${jobId}`);
  fetch(queueProcessorUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": process.env.INTERNAL_API_SECRET || "some-secret", // Ensure this is set in production
    },
    body: JSON.stringify({ jobId }),
  }).catch(error => {
    // This will only catch network errors, not response errors (4xx, 5xx)
    console.error(`FATAL: Trigger failed for job ${jobId}. Network error:`, error);
  });
}
