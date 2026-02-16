
import { pipeline, env } from '@xenova/transformers';

// Skip local model checks
env.allowLocalModels = false;
env.useBrowserCache = true;

class AIWorker {
    private static instance: AIWorker;
    private pipe: any = null;
    private isModelLoading = false;

    static getInstance() {
        if (!AIWorker.instance) {
            AIWorker.instance = new AIWorker();
        }
        return AIWorker.instance;
    }

    async init(callback: (data: any) => void) {
        if (this.pipe) return;
        if (this.isModelLoading) return;

        this.isModelLoading = true;
        try {
            callback({ status: 'loading', message: 'Loading AI Model...', progress: 0 });

            // Initialize pipeline
            this.pipe = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-248M', {
                progress_callback: (data: any) => {
                    if (data.status === 'progress') {
                        callback({
                            status: 'loading',
                            message: `Loading AI Model... (${Math.round(data.progress || 0)}%)`,
                            progress: data.progress
                        });
                    }
                }
            });

            this.isModelLoading = false;
            callback({ status: 'ready', message: 'AI Ready' });
        } catch (err: any) {
            this.isModelLoading = false;
            callback({ status: 'error', message: err.message || 'Failed to load model' });
        }
    }

    async generate(text: string, task: 'chat' | 'fix' | 'summarize', callback: (data: any) => void) {
        if (!this.pipe) {
            await this.init(callback);
        }

        callback({ status: 'processing', message: 'Thinking...' });

        try {
            let prompt = text;
            let max_length = 256;

            // Simple prompt engineering for task
            if (task === 'fix') {
                prompt = `Fix grammar: ${text}`;
                max_length = 128;
            } else if (task === 'summarize') {
                prompt = `Summarize this text: ${text}`;
                max_length = 200;
            } else {
                // Chat / General
                // LaMini is instruction tuned, so direct instruction is best.
                // If it's conversational, we might need a prefix or context, but let's try raw first.
                // prompt = `User: ${text}\nAssistant:`;
                // Actually LaMini handles raw instructions well.
            }

            const output = await this.pipe(prompt, {
                max_new_tokens: max_length,
                temperature: 0.7,
                do_sample: true,
            });

            const resultText = output[0]?.generated_text || '';
            callback({ status: 'complete', result: resultText });

        } catch (err: any) {
            callback({ status: 'error', message: err.message });
        }
    }
}

const worker = AIWorker.getInstance();

self.addEventListener('message', async (event: MessageEvent) => {
    const { type, payload } = event.data;

    const send = (data: any) => self.postMessage(data);

    switch (type) {
        case 'init':
            await worker.init(send);
            break;
        case 'chat':
            await worker.generate(payload, 'chat', send);
            break;
        case 'fix':
            await worker.generate(payload, 'fix', send);
            break;
        case 'summarize':
            await worker.generate(payload, 'summarize', send);
            break;
        default:
            send({ status: 'error', message: 'Unknown command' });
    }
});
