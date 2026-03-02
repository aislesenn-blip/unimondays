
// src/lib/queue.ts
import { Client, Receiver } from "@upstash/qstash";

if (
  !process.env.QSTASH_TOKEN ||
  !process.env.QSTASH_URL ||
  !process.env.QSTASH_CURRENT_SIGNING_KEY ||
  !process.env.QSTASH_NEXT_SIGNING_KEY
) {
  throw new Error("QStash environment variables are not set correctly!");
}

export const qstash = new Client({
  token: process.env.QSTASH_TOKEN,
});

export const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
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
