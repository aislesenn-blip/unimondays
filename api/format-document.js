// api/format-document.js
import mammoth from 'mammoth';
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    TableOfContents,
    Footer,
    PageNumber,
    AlignmentType,
    PageOrientation,
    Convert
} from 'docx';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        let body = request.body;

        if (!body || typeof body !== 'object') {
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

        // 1. EXTRACT RAW TEXT
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        const text = result.value;

        if (!text) {
             return response.status(400).json({ message: 'Could not extract text from document.' });
        }

        // 2. PARSE CONFIG & CONTENT
        // Default values based on PlaybookProConfig interface
        const {
            pageSize = 'a4',
            orientation = 'portrait',
            margins = 'normal',
            fontFamily = 'times',
            fontSize = 12,
            lineSpacing = '2.0',
            alignment = 'left',
            addPageNumbers = true,
            autoToc = true,
            citationStyle = 'apa',
            imageAlignment = 'center'
        } = config || {};

        // Font Mapping
        const fontFace = fontFamily === 'arial' ? 'Arial' : fontFamily === 'calibri' ? 'Calibri' : 'Times New Roman';

        // Spacing Mapping (twips: 240 = 1 line)
        let docLineSpacing = 480; // 2.0
        if (lineSpacing === '1.0') docLineSpacing = 240;
        if (lineSpacing === '1.5') docLineSpacing = 360;

        // Alignment Mapping
        const docAlignment = alignment === 'justify' ? AlignmentType.JUSTIFIED : AlignmentType.LEFT;

        // Margins Mapping (twips: 1440 = 1 inch)
        let docMargins = { top: 1440, bottom: 1440, left: 1440, right: 1440 }; // Normal
        if (margins === 'narrow') docMargins = { top: 720, bottom: 720, left: 720, right: 720 }; // 0.5"
        if (margins === 'wide') docMargins = { top: 1440, bottom: 1440, left: 2880, right: 2880 }; // 2" sides

        // Size Mapping (pt * 2)
        const docFontSize = fontSize * 2;

        const paragraphs = text.split('\n').filter(p => p.trim().length > 0);

        // 3. REBUILD WITH DOCX
        const docChildren = [];

        // Title Page / Header
        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: "Formatted by Playbook Pro",
                        bold: true,
                        size: 32, // 16pt
                        font: fontFace
                    }),
                    new TextRun({
                        text: `\n${citationStyle.toUpperCase()} Style applied`,
                        italics: true,
                        size: 20,
                        font: fontFace,
                        break: 1
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 }
            })
        );

        // Auto-TOC
        if (autoToc) {
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
                    heading: HeadingLevel.HEADING_1,
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
        paragraphs.forEach(p => {
            const trimmed = p.trim();
            // Heuristic for Headings
            const isHeading = trimmed.length < 80 && !trimmed.endsWith('.') && /^[A-Z]/.test(trimmed) && trimmed.split(' ').length < 10;

            if (isHeading) {
                 docChildren.push(new Paragraph({
                    text: trimmed,
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 240, after: 120 },
                    alignment: AlignmentType.LEFT // Headings usually left
                }));
            } else {
                docChildren.push(new Paragraph({
                    children: [new TextRun({
                        text: trimmed,
                        font: fontFace,
                        size: docFontSize
                    })],
                    spacing: {
                        line: docLineSpacing,
                        after: 200
                    },
                    alignment: docAlignment
                }));
            }
        });

        // Sections Configuration
        const sectionProps = {
            properties: {
                page: {
                    size: {
                        orientation: orientation === 'landscape' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
                    },
                    margin: docMargins
                }
            },
            children: docChildren,
        };

        // Footer with Page Numbers
        if (addPageNumbers) {
            sectionProps.footers = {
                default: new Footer({
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({
                                    children: [PageNumber.CURRENT],
                                }),
                            ],
                        }),
                    ],
                }),
            };
        }

        const doc = new Document({
            sections: [sectionProps]
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
        bodyParser: true,
    },
};
