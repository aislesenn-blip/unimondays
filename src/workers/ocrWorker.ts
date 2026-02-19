import { createWorker } from 'tesseract.js';

self.onmessage = async (e) => {
    const { image } = e.data;

    try {
        const worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(image);
        await worker.terminate();

        self.postMessage({ status: 'success', text });
    } catch (error) {
        self.postMessage({ status: 'error', error: 'OCR Failed' });
    }
};
