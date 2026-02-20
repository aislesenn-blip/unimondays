import pptxgen from "pptxgenjs";

// Types
interface PlaybookXConfig {
    aspectRatio: '16x9' | '4x3';
    theme: 'academic' | 'corporate' | 'creative' | 'dark';
    maxBulletsPerSlide: number;
    autoSplitLongText: boolean;
    addSpeakerNotes: boolean;
    addSlideNumbers: boolean;
    exportFormat: 'pptx';
}

self.onmessage = async (e: MessageEvent) => {
    // New payload structure
    const { text, config } = e.data as { text: string, config: PlaybookXConfig };

    try {
        const pres = new pptxgen();

        // 1. GLOBAL CONFIG
        pres.layout = config.aspectRatio === '4x3' ? "LAYOUT_4x3" : "LAYOUT_16x9";

        // 2. THEME SETUP
        let bg = "FFFFFF";
        let color = "000000";
        let accent = "0078D7";
        let fontFace = "Arial";
        let titleColor = "0078D7";

        if (config.theme === 'academic') {
            bg = "FFFFFF";
            color = "333333";
            accent = "000000";
            titleColor = "000000";
            fontFace = "Times New Roman";
        } else if (config.theme === 'corporate') {
            bg = "EFF6FF"; // Light Blue
            color = "1E3A8A"; // Dark Blue
            accent = "2563EB";
            titleColor = "1E40AF";
            fontFace = "Arial";
        } else if (config.theme === 'creative') {
            bg = "FAF5FF"; // Light Purple
            color = "581C87"; // Dark Purple
            accent = "9333EA";
            titleColor = "7E22CE";
            fontFace = "Calibri";
        } else if (config.theme === 'dark') {
            bg = "111827"; // Slate 900
            color = "F9FAFB"; // Slate 50
            accent = "10B981"; // Emerald
            titleColor = "34D399";
            fontFace = "Verdana";
        }

        // 3. PARSING & RULES ENGINE
        const rawSlides: { title: string, bullets: string[] }[] = [];
        let currentTitle = "Introduction";
        let currentBullets: string[] = [];

        const lines = text.split('\n');

        const pushSlide = () => {
             if (currentBullets.length > 0 || currentTitle) {
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
                if (config.autoSplitLongText && trimmed.length > 200) {
                     // Split by sentences
                     const sentences: string[] = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
                     currentBullets.push(...sentences.map((s: string) => s.trim()));
                } else {
                    currentBullets.push(trimmed);
                }
            }
        }
        pushSlide();

        // 4. LAYOUT & OVERFLOW PROCESSING
        const finalSlides: { title: string, bullets: string[], layout: '1-col' | '2-col' }[] = [];

        for (const slide of rawSlides) {
            const MAX_PER_SLIDE = config.maxBulletsPerSlide || 7;
            const bullets = slide.bullets;

            if (bullets.length === 0) {
                 finalSlides.push({ title: slide.title, bullets: [], layout: '1-col' });
                 continue;
            }

            // RULE: Overflow Rule
            for (let i = 0; i < bullets.length; i += MAX_PER_SLIDE) {
                const chunk = bullets.slice(i, i + MAX_PER_SLIDE);
                let title = slide.title;
                if (i > 0) title += " (cont.)";

                // RULE: Column Rule (Heuristic: > 5 bullets = 2 cols, IF allowed by visual space)
                const layout = chunk.length >= 5 ? '2-col' : '1-col';
                finalSlides.push({ title, bullets: chunk, layout });
            }
        }

        if (finalSlides.length === 0) {
             finalSlides.push({ title: "Welcome to Playbook", bullets: ["Start typing to generate slides."], layout: '1-col' });
        }

        // 5. GENERATION
        for (const s of finalSlides) {
            const slide = pres.addSlide();
            slide.background = { color: bg };
            slide.color = color;

            // Slide Numbers
            if (config.addSlideNumbers) {
                slide.slideNumber = { x: "90%", y: "90%", color: accent };
            }

            // Title
            slide.addText(s.title, {
                x: 0.5, y: 0.5, w: "90%", h: 1,
                fontSize: 32,
                fontFace,
                bold: true,
                color: titleColor,
            });

            // Bullets
            const commonOpt = { fontSize: 18, fontFace, color, valign: "top" as const };

            if (s.layout === '2-col') {
                const mid = Math.ceil(s.bullets.length / 2);
                const col1 = s.bullets.slice(0, mid);
                const col2 = s.bullets.slice(mid);

                slide.addText(col1.map(t => ({ text: t, options: { bullet: true } })), {
                    x: 0.5, y: 1.5, w: "45%", h: "75%",
                    ...commonOpt, fontSize: 16
                });
                slide.addText(col2.map(t => ({ text: t, options: { bullet: true } })), {
                    x: config.aspectRatio === '16x9' ? 5.0 : 3.8, // Adjust 2nd col position for ratio
                    y: 1.5,
                    w: "45%", h: "75%",
                    ...commonOpt, fontSize: 16
                });
            } else {
                 slide.addText(s.bullets.map(t => ({ text: t, options: { bullet: true } })), {
                    x: 0.5, y: 1.5, w: "90%", h: "75%",
                    ...commonOpt
                });
            }

            // Speaker Notes
            if (config.addSpeakerNotes) {
                slide.addNotes(`Slide: ${s.title}\n\nKey Points:\n- ${s.bullets.join('\n- ')}\n\n(Generated by Playbook X)`);
            }
        }

        // 6. EXPORT
        const pptBlob = await pres.write({ outputType: 'blob' }) as Blob;

        const finalBlob = new Blob([pptBlob], {
            type: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        });

        // 7. STATS for QC
        const stats = {
            slideCount: finalSlides.length,
            layout: config.aspectRatio,
            theme: config.theme
        };

        self.postMessage({ status: 'success', blob: finalBlob, stats });

    } catch (e: any) {
        console.error(e);
        self.postMessage({ status: 'error', message: e.message });
    }
};
