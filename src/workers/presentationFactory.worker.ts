import PptxGenJS from 'pptxgenjs';

self.onmessage = async (e) => {
    const { type, content, metadata } = e.data;
    if (type !== 'generate_ppt') return;

    try {
        // @ts-ignore
        const pptx = new PptxGenJS();

        // --- 1. TITLE SLIDE ---
        let slide = pptx.addSlide();

        // Background
        slide.background = { color: 'F1F5F9' }; // Slate 50

        // Title
        slide.addText(metadata.title || "Untitled Presentation", {
            x: '10%', y: '40%', w: '80%', h: 1,
            fontSize: 36, color: '1e293b', align: 'center', bold: true
        });

        // Subtitle (Student Name)
        slide.addText(`Presented by: ${metadata.name || "Student"}`, {
            x: '10%', y: '55%', w: '80%', h: 0.5,
            fontSize: 18, color: '64748b', align: 'center'
        });

        // --- 2. CONTENT SLIDES ---
        // Naive Logic: Split by double newlines. If line starts with "Chapter" or is short/caps, it's a header.
        // Otherwise bullet point.

        const paragraphs = content.split(/\n\s*\n/);

        paragraphs.forEach((para: string) => {
            const lines = para.split('\n');
            if (lines.length === 0) return;

            const header = lines[0];
            const body = lines.slice(1).join('\n'); // Plain text body

            let contentSlide = pptx.addSlide();
            contentSlide.background = { color: 'FFFFFF' };

            // Header
            contentSlide.addText(header, {
                x: 0.5, y: 0.5, w: '90%', h: 1,
                fontSize: 24, color: '10b981', bold: true // Emerald header
            });

            // Body
            if (body) {
                contentSlide.addText(body, {
                    x: 0.5, y: 1.5, w: '90%', h: '60%',
                    fontSize: 14, color: '334155', align: 'left',
                    bullet: true
                });
            } else {
                 // If no body, maybe the header was actually body text?
                 // For MVP, we assume structure. If only 1 line, we just center it.
                 // Overwriting previous addText if needed? No, just add another if empty body is weird.
            }
        });

        const blob = await pptx.write({ outputType: 'blob' });
        self.postMessage({ status: 'success', blob });

    } catch (error) {
        console.error(error);
        self.postMessage({ status: 'error', message: 'Failed to generate presentation.' });
    }
};
