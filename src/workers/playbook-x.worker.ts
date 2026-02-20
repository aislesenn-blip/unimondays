import pptxgen from "pptxgenjs";

self.onmessage = async (e: MessageEvent) => {
    const { text, theme } = e.data;

    try {
        const pres = new pptxgen();
        pres.layout = "LAYOUT_16x9";

        // 1. THEME SETUP
        let bg = "FFFFFF";
        let color = "000000";
        let accent = "0078D7";
        let fontFace = "Arial";

        if (theme === 'academic') {
            bg = "FFFFFF";
            color = "333333";
            accent = "000000";
            fontFace = "Times New Roman";
        } else if (theme === 'corporate') {
            bg = "EFF6FF"; // Light Blue
            color = "1E3A8A"; // Dark Blue
            accent = "2563EB"; // Blue 600
            fontFace = "Arial";
        } else if (theme === 'dark') {
            bg = "111827"; // Slate 900
            color = "F9FAFB"; // Slate 50
            accent = "10B981"; // Emerald
            fontFace = "Verdana";
        }

        // 2. PARSING & RULES ENGINE
        const rawSlides: { title: string, bullets: string[] }[] = [];
        let currentTitle = "Introduction";
        let currentBullets: string[] = [];

        const lines = text.split('\n');

        const pushSlide = () => {
             if (currentBullets.length > 0 || currentTitle) {
                // Ignore empty slides unless it's the only one
                rawSlides.push({ title: currentTitle, bullets: [...currentBullets] });
                currentBullets = [];
            }
        };

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // RULE: Heading 1 = New Slide
            if (trimmed.startsWith('#')) {
                pushSlide();
                currentTitle = trimmed.replace(/^#+\s*/, '');
            } else {
                // RULE: 3-Line Rule (Auto-split long paragraphs)
                // Assuming ~200 chars is "3 lines" visually on a slide
                if (trimmed.length > 200) {
                     // Split by sentences to make bullets
                     const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
                     currentBullets.push(...sentences.map(s => s.trim()));
                } else {
                    currentBullets.push(trimmed);
                }
            }
        }
        pushSlide(); // Push the final slide content

        // 3. LAYOUT & OVERFLOW PROCESSING
        const finalSlides: { title: string, bullets: string[], layout: '1-col' | '2-col' }[] = [];

        for (const slide of rawSlides) {
            const MAX_PER_SLIDE = 8;
            const bullets = slide.bullets;

            if (bullets.length === 0) {
                 finalSlides.push({ title: slide.title, bullets: [], layout: '1-col' });
                 continue;
            }

            // RULE: Overflow Rule (Split slides if > MAX_PER_SLIDE)
            for (let i = 0; i < bullets.length; i += MAX_PER_SLIDE) {
                const chunk = bullets.slice(i, i + MAX_PER_SLIDE);
                let title = slide.title;
                if (i > 0) title += " (cont.)";

                // RULE: Column Rule (If 5-8 bullets, use 2 columns)
                const layout = chunk.length >= 5 ? '2-col' : '1-col';
                finalSlides.push({ title, bullets: chunk, layout });
            }
        }

        // Fallback for empty input
        if (finalSlides.length === 0) {
             finalSlides.push({ title: "Welcome to Playbook", bullets: ["Start typing to generate slides."], layout: '1-col' });
        }

        // 4. GENERATION
        for (const s of finalSlides) {
            const slide = pres.addSlide();
            slide.background = { color: bg };
            slide.color = color;

            // Title
            slide.addText(s.title, {
                x: 0.5, y: 0.5, w: "90%", h: 1,
                fontSize: 32,
                fontFace,
                bold: true,
                color: accent,
            });

            // Bullets
            const commonOpt = { fontSize: 18, fontFace, color, valign: "top" as const };

            if (s.layout === '2-col') {
                const mid = Math.ceil(s.bullets.length / 2);
                const col1 = s.bullets.slice(0, mid);
                const col2 = s.bullets.slice(mid);

                // Col 1
                slide.addText(col1.map(t => ({ text: t, options: { bullet: true } })), {
                    x: 0.5, y: 1.5, w: "45%", h: "75%",
                    ...commonOpt, fontSize: 16 // Slightly smaller for dense content
                });
                // Col 2
                slide.addText(col2.map(t => ({ text: t, options: { bullet: true } })), {
                    x: 5.0, y: 1.5, w: "45%", h: "75%",
                    ...commonOpt, fontSize: 16
                });
            } else {
                 // 1 Col
                 slide.addText(s.bullets.map(t => ({ text: t, options: { bullet: true } })), {
                    x: 0.5, y: 1.5, w: "90%", h: "75%",
                    ...commonOpt
                });
            }
        }

        // 5. EXPORT & MIME TYPE FIX
        // Get blob with generic type first
        const pptBlob = await pres.write({ outputType: 'blob' }) as Blob;

        // CRITICAL FIX: Enforce correct MIME type for Mobile compatibility
        const finalBlob = new Blob([pptBlob], {
            type: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        });

        self.postMessage({ status: 'success', blob: finalBlob });

    } catch (e: any) {
        console.error(e);
        self.postMessage({ status: 'error', message: e.message });
    }
};
