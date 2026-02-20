import { pipeline, env } from '@xenova/transformers';

// Configure to use local models or cache effectively
env.allowLocalModels = false; // We fetch from HF Hub
env.useBrowserCache = true;

// Define the system prompt for "Playbook"
const SYSTEM_PROMPT = `You are Playbook, a brilliant, supportive, and local academic companion for students in Tanzania.
You speak English, Swahili, and Swanglish.
Your goal is to explain complex concepts using local analogies (e.g., Kariakoo market, daladala routes).
You are NOT a generic assistant. You are Playbook.
`;

let generator: any = null;
let isModelLoading = false;

// Simple RAG Store (Array of text chunks)
let documentStore: string[] = [];

self.onmessage = async (e) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'load':
            await loadModel();
            break;
        case 'ingest':
            // Add text to store
            documentStore.push(payload.text);
            self.postMessage({ status: 'ingested', count: documentStore.length });
            break;
        case 'generate':
            await generateResponse(payload.prompt, payload.context);
            break;
    }
};

async function loadModel() {
    if (generator) {
        self.postMessage({ status: 'ready' });
        return;
    }
    if (isModelLoading) return;

    isModelLoading = true;
    try {
        // Using a small, high-quality model compatible with Transformers.js
        // Qwen-0.5B or similar standard task model.
        // For 'text-generation', we might use 'Xenova/Qwen1.5-0.5B-Chat' if available, or 'Xenova/LaMini-Flan-T5-248M' for reliability.
        // Let's use LaMini for stability/size ratio (~300MB) or Qwen if supported.
        // Checking widely used small model: Xenova/LaMini-Flan-T5-248M is robust.

        self.postMessage({ status: 'progress', progress: 0, message: 'Initiating Engine...' });

        // Progress callback
        const progressCallback = (p: any) => {
            if (p.status === 'progress') {
                self.postMessage({ status: 'progress', progress: p.progress, message: `Downloading ${p.file}` });
            }
        };

        generator = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-248M', {
            progress_callback: progressCallback
        });

        isModelLoading = false;
        self.postMessage({ status: 'ready' });
    } catch (error) {
        console.error(error);
        self.postMessage({ status: 'error', message: 'Failed to load brain engine.' });
        isModelLoading = false;
    }
}

async function generateResponse(userPrompt: string, context?: string) {
    if (!generator) {
        self.postMessage({ status: 'error', message: 'Engine not loaded.' });
        return;
    }

    // 1. Retrieve Context (Simple Keyword Match for MVP)
    // If context is provided (e.g. highlighted text), use it directly.
    // If not, search documentStore.
    let relevantContext = context || "";

    if (!relevantContext && documentStore.length > 0) {
        // Naive RAG: Find chunks containing keywords from prompt
        const keywords = userPrompt.split(' ').filter(w => w.length > 3);
        const matches = documentStore.filter(chunk =>
            keywords.some(k => chunk.toLowerCase().includes(k.toLowerCase()))
        );
        relevantContext = matches.slice(0, 3).join('\n\n'); // Top 3 chunks
    }

    // 2. Construct Prompt
    const fullInput = `${SYSTEM_PROMPT}\n\nContext:\n${relevantContext}\n\nUser: ${userPrompt}\n\nPlaybook:`;

    // 3. Generate
    try {
        const output = await generator(fullInput, {
            max_new_tokens: 256,
            temperature: 0.7,
            do_sample: true
        });

        self.postMessage({ status: 'response', text: output[0].generated_text });
    } catch (error) {
        self.postMessage({ status: 'error', message: 'Thinking failed.' });
    }
}
