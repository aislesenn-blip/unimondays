// src/workers/playbook-pro.worker.ts
import { Document, Packer, Paragraph, TextRun, HeadingLevel, TableOfContents } from "docx";
// Import other necessary libraries if needed for parsing, e.g., mammoth (if importing .docx)
// For simplicity, we assume text input or re-processing logic is handled here.
// But wait, the user wants "A student uploads a raw .docx or .txt file".
// To parse .docx in the browser, we need 'mammoth' or 'jszip'.
// Let's assume text input for MVP or simple .txt parsing for zero-lag demonstration if full docx parsing is heavy.
// Actually, `mammoth` is installed (`package.json`).
import mammoth from "mammoth";

self.onmessage = async (e: MessageEvent) => {
    const { file, config } = e.data; // config: { spacing, font, toc }

    try {
        // 1. READ CONTENT
        let textContent = "";
        let arrayBuffer: ArrayBuffer;

        if (file instanceof File) {
            arrayBuffer = await file.arrayBuffer();
             if (file.name.endsWith(".docx")) {
                const result = await mammoth.extractRawText({ arrayBuffer });
                textContent = result.value;
            } else {
                textContent = await file.text();
            }
        } else {
            textContent = file; // Direct text input
        }

        // 2. PROCESS CONTENT (The "Formatter" Logic)
        // Split by double newlines to find paragraphs vs headings?
        // Simple heuristic: Short lines (under 100 chars) are Headings? No, that's unreliable.
        // For this "Pro" formatter, we might just treat it as a text dump formatted nicely.
        // OR: Detect "Chapter" or "1." as headings.
        // Let's implement a basic paragraph splitter.
        const lines = textContent.split(/\n\s*\n/); // Split by empty lines

        const children = [];

        // Add Table of Contents if requested
        if (config.toc) {
            children.push(new TableOfContents("Table of Contents", {
                hyperlink: true,
                headingStyleRange: "1-5",
            }));
            children.push(new Paragraph({
                pageBreakBefore: true
            }));
        }

        // Font Config
        const font = config.font === 'times' ? 'Times New Roman' : 'Arial';
        const size = 24; // 12pt (docx uses half-points)

        // Process Lines
        lines.forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // Simple Heuristic for Heading: All Caps or Short & Ends with no punctuation?
            const isHeading = trimmed.length < 50 && !trimmed.endsWith('.') && (trimmed === trimmed.toUpperCase() || /^(Chapter|Section|\d+\.)/.test(trimmed));

            if (isHeading) {
                children.push(new Paragraph({
                    text: trimmed,
                    heading: HeadingLevel.HEADING_1,
                    spacing: { after: 200, before: 200 }
                }));
            } else {
                children.push(new Paragraph({
                    children: [new TextRun({
                        text: trimmed,
                        font: font,
                        size: size
                    })],
                    spacing: {
                        line: config.spacing === '2.0' ? 480 : 360, // 240 = 1.0, 360 = 1.5, 480 = 2.0
                        after: 200
                    },
                    indent: { firstLine: 720 } // 0.5 inch indent
                }));
            }
        });

        // 3. GENERATE DOCUMENT
        const doc = new Document({
            sections: [{
                properties: {},
                children: children
            }]
        });

        // 4. EXPORT
        const blob = await Packer.toBlob(doc);
        self.postMessage({ status: 'success', blob });

    } catch (error: any) {
        self.postMessage({ status: 'error', message: error.message });
    }
};
