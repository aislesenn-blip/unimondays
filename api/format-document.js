// api/format-document.js
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from 'docx';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const chunks = [];
        for await (const chunk of request) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        if (!buffer || buffer.length === 0) {
             return response.status(400).json({ message: 'No file provided' });
        }

        // 1. EXTRACT RAW TEXT (using mammoth for reliability)
        const result = await mammoth.extractRawText({ buffer: buffer });
        const text = result.value;

        if (!text) {
             return response.status(400).json({ message: 'Could not extract text from document.' });
        }

        // 2. PARSE CONTENT (Simplified rule-based parser)
        const paragraphs = text.split('\n').filter(p => p.trim().length > 0);

        // 3. REBUILD WITH DOCX
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Formatted by Playbook Pro (Secure Cloud)",
                                bold: true,
                                size: 32, // 16pt
                                font: "Arial"
                            })
                        ],
                        spacing: { after: 400 }
                    }),
                    // Add extracted paragraphs
                    ...paragraphs.map(p => new Paragraph({
                        children: [new TextRun({
                            text: p.trim(),
                            font: "Times New Roman",
                            size: 24 // 12pt
                        })],
                        spacing: {
                            line: 480, // Double spacing (240 * 2)
                            after: 200
                        }
                    }))
                ]
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
        bodyParser: false, // We handle the raw stream
    },
};
