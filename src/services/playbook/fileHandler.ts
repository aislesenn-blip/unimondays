import { Document, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n\n";
    }
    return fullText;
};

export const generateDocx = async (content: string): Promise<Blob> => {
    // Split content by newlines to create paragraphs
    const paragraphs = content.split('\n').map(line =>
        new Paragraph({
            children: [new TextRun(line)],
            spacing: { after: 200 }
        })
    );

    const doc = new Document({
        sections: [{
            properties: {},
            children: paragraphs,
        }],
    });

    return await Packer.toBlob(doc);
};

export const generatePdf = (content: string): Blob => {
    const doc = new jsPDF();

    // Split text to fit page
    const splitText = doc.splitTextToSize(content, 180);
    let y = 10;

    splitText.forEach((line: string) => {
        if (y > 280) {
            doc.addPage();
            y = 10;
        }
        doc.text(line, 10, y);
        y += 7;
    });

    return doc.output('blob');
};
