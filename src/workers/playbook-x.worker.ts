// src/workers/playbook-x.worker.ts
import pptxgen from "pptxgenjs";

self.onmessage = async (e: MessageEvent) => {
    const { text, theme } = e.data;

    try {
        const pres = new pptxgen();

        // 1. THEME SETUP
        // Define colors/fonts based on theme
        let bg = "FFFFFF";
        let color = "000000";
        let accent = "0078D7"; // Default Corporate Blue

        if (theme === 'academic') {
            bg = "F5F5F5"; // Off-white
            color = "333333";
            accent = "800000"; // Maroon
        } else if (theme === 'startup') {
            bg = "111827"; // Dark gray/black
            color = "FFFFFF";
            accent = "10B981"; // Emerald
        }

        pres.layout = "LAYOUT_16x9";

        // 2. PARSE CONTENT (Rule-Based Engine)
        const lines = text.split('\n');
        let bullets: string[] = [];

        const createSlide = (title: string, bodyPoints: string[]) => {
            if (!title && bodyPoints.length === 0) return;

            const slide = pres.addSlide();
            slide.background = { color: bg };
            slide.color = color;

            // Title
            slide.addText(title || "Untitled Slide", {
                x: 0.5, y: 0.5, w: "90%", h: 1,
                fontSize: 32,
                fontFace: "Arial",
                bold: true,
                color: accent,
                align: "left"
            });

            // Body
            if (bodyPoints.length > 0) {
                // Check if too many bullets (Rule: > 5 bullets = Split or 2-col)
                if (bodyPoints.length > 7) {
                    slide.addText(bodyPoints.map(p => ({ text: p, options: { bullet: true } })), {
                        x: 0.5, y: 1.5, w: "90%", h: "70%",
                        fontSize: 14,
                        color: color,
                        align: "left",
                        valign: "top"
                    });
                } else {
                    slide.addText(bodyPoints.map(p => ({ text: p, options: { bullet: true } })), {
                        x: 0.5, y: 1.5, w: "90%", h: "70%",
                        fontSize: 18,
                        color: color,
                        align: "left",
                        valign: "top"
                    });
                }
            }
        };

        let currentTitle = "Introduction"; // Default title

        lines.forEach((line: string) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // Check for Heading (User Rule: Heading 1 = New Slide)
            const isHeading = trimmed.startsWith('#') || (trimmed.length < 50 && !trimmed.endsWith('.') && /^[A-Z]/.test(trimmed));

            if (isHeading) {
                // If we have a previous slide accumulating, create it
                if (bullets.length > 0 || currentTitle !== "Introduction") {
                    createSlide(currentTitle, bullets);
                    bullets = []; // Reset
                }
                currentTitle = trimmed.replace(/^#\s*/, '');
            } else {
                // It's a bullet
                bullets.push(trimmed);
            }
        });

        // Create the final slide
        if (bullets.length > 0 || currentTitle) {
            createSlide(currentTitle, bullets);
        }

        // 3. EXPORT
        // write('blob') returns a Promise<Blob>
        const blob = await pres.write({ outputType: 'blob' });

        self.postMessage({ status: 'success', blob });

    } catch (error: any) {
        console.error(error);
        self.postMessage({ status: 'error', message: error.message });
    }
};
