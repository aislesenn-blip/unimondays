import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { processSubmission } from "@/inngest/functions";

// Next.js Route Handler strictly configured for handling asynchronous jobs
// Avoiding Vercel Server Action timeouts
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processSubmission, // The core Deterministic Grader engine
  ],
});
