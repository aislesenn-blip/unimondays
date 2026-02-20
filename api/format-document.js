// api/format-document.js
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, TableOfContents } from 'docx';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // Read JSON Body
        // Vercel serverless functions usually parse JSON body automatically if Content-Type is application/json
        // but let's be safe and read the stream if needed, or use request.body
        let body = request.body;

        if (!body || typeof body !== 'object') {
            // Fallback: Read stream if body is not parsed
            const chunks = [];
            for await (const chunk of request) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);
            body = JSON.parse(buffer.toString());
        }

        const { file, config } = body;

        if (!file) {
             return response.status(400).json({ message: 'No file provided' });
        }

        const fileBuffer = Buffer.from(file, 'base64');

        // 1. EXTRACT RAW TEXT (using mammoth for reliability)
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        const text = result.value;

        if (!text) {
             return response.status(400).json({ message: 'Could not extract text from document.' });
        }

        // 2. PARSE CONFIG & CONTENT
        const { spacing = '2.0', font = 'times', toc = true } = config || {};

        // Font Mapping
        const fontFace = font === 'arial' ? 'Arial' : 'Times New Roman';

        // Spacing Mapping (docx uses "twips", 240 = 1 line)
        let lineSpacing = 480; // Default 2.0
        if (spacing === '1.0') lineSpacing = 240;
        if (spacing === '1.5') lineSpacing = 360;

        const paragraphs = text.split('\n').filter(p => p.trim().length > 0);

        // 3. REBUILD WITH DOCX
        const docChildren = [];

        // Title Page / Header
        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: "Formatted by Playbook Pro (Secure Cloud)",
                        bold: true,
                        size: 32, // 16pt
                        font: fontFace
                    })
                ],
                spacing: { after: 400 }
            })
        );

        // Auto-TOC
        if (toc) {
            docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Table of Contents",
                            bold: true,
                            size: 28, // 14pt
                            font: fontFace
                        })
                    ],
                    heading: HeadingLevel.HEADING_1, // To ensure it doesn't break structure, though usually TOC is separate
                    spacing: { after: 200 }
                }),
                new TableOfContents("Summary", {
                    hyperlink: true,
                    headingStyleRange: "1-3",
                }),
                new Paragraph({
                    children: [],
                    pageBreakBefore: true
                })
            );
        }

        // Content Processing
        // Simple Heuristic: If line is short and looks like a title, make it a Heading
        // Otherwise, paragraph.
        paragraphs.forEach(p => {
            const trimmed = p.trim();
            const isHeading = trimmed.length < 60 && !trimmed.endsWith('.') && /^[A-Z]/.test(trimmed);

            if (isHeading) {
                 docChildren.push(new Paragraph({
                    text: trimmed,
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 240, after: 120 }
                }));
            } else {
                docChildren.push(new Paragraph({
                    children: [new TextRun({
                        text: trimmed,
                        font: fontFace,
                        size: 24 // 12pt
                    })],
                    spacing: {
                        line: lineSpacing,
                        after: 200
                    }
                }));
            }
        });

        const doc = new Document({
            sections: [{
                properties: {},
                children: docChildren
            }]
        });

        // 4. GENERATE BUFFER
        const outputBuffer = await Packer.toBuffer(doc);

        // 5. SEND RESPONSE
        response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        response.setHeader('Content-Disposition', 'attachment; filename=Formatted_Document.docx');
        response.send(outputBuffer);

    } catch (error) {
        console.error("Cloud Processing Error:", error);
        response.status(500).json({ message: 'Processing Failed: ' + error.message });
    }
}

export const config = {
    api: {
        bodyParser: true, // Enable body parsing for JSON
    },
};
