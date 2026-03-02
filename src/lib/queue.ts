
// src/lib/queue.ts
import { Queue } from "@upstash/qstash";

if (!process.env.QSTASH_TOKEN || !process.env.QSTASH_URL) {
  throw new Error("QStash environment variables are not set!");
}

export const qstash = new Queue({
  token: process.env.QSTASH_TOKEN,
});

export const getBaseUrl = () => {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

export const enqueueJob = (jobId: string) => {
  return qstash.publishJSON({
    url: `${getBaseUrl()}/api/queue/process`,
    body: {
      jobId,
    },
    retries: 5,
  });
};
