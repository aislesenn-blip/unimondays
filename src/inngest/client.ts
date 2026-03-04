import { Inngest } from "inngest";

// Create a client to send and receive events
// This client is strictly configured for the enterprise production environment
export const inngest = new Inngest({ id: "playbook-engine" });
