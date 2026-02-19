import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
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

const parseTextRuns = (node: Node): TextRun[] => {
    const runs: TextRun[] = [];
    node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
            runs.push(new TextRun(child.textContent || ''));
        } else if (child.nodeName === 'B' || child.nodeName === 'STRONG') {
             runs.push(new TextRun({ text: child.textContent || '', bold: true }));
        } else if (child.nodeName === 'I' || child.nodeName === 'EM') {
             runs.push(new TextRun({ text: child.textContent || '', italics: true }));
        } else {
             // Flatten nested or other tags
             if (child.childNodes.length > 0) {
                 runs.push(...parseTextRuns(child));
             } else {
                 runs.push(new TextRun(child.textContent || ''));
             }
        }
    });
    return runs;
}

export const generateDocx = async (htmlContent: string): Promise<Blob> => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const nodes = Array.from(doc.body.childNodes);

    const children: Paragraph[] = [];

    nodes.forEach(node => {
        if (node.nodeName === 'H1') {
            children.push(new Paragraph({
                text: node.textContent || '',
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200, before: 200 }
            }));
        } else if (node.nodeName === 'H2') {
             children.push(new Paragraph({
                text: node.textContent || '',
                heading: HeadingLevel.HEADING_2,
                spacing: { after: 200, before: 100 }
            }));
        } else if (node.nodeName === 'H3') {
             children.push(new Paragraph({
                text: node.textContent || '',
                heading: HeadingLevel.HEADING_3,
                spacing: { after: 100, before: 100 }
            }));
        } else if (node.nodeName === 'P' || node.nodeName === 'DIV') {
             const textRuns = parseTextRuns(node);
             // Filter empty paragraphs
             if (textRuns.length > 0 && textRuns.some(r => r instanceof TextRun && (r as any).root && (r as any).root[1] !== '')) {
                 children.push(new Paragraph({
                     children: textRuns,
                     spacing: { after: 200 }
                 }));
             } else if (textRuns.length > 0) { // Push anyway if it has content
                 children.push(new Paragraph({
                     children: textRuns,
                     spacing: { after: 200 }
                 }));
             }
        } else if (node.nodeName === '#text') {
            if (node.textContent?.trim()) {
                 children.push(new Paragraph({
                     children: [new TextRun(node.textContent)],
                     spacing: { after: 200 }
                 }));
            }
        }
    });

    const docx = new Document({
        sections: [{
            properties: {},
            children: children,
        }],
    });

    return await Packer.toBlob(docx);
};

export const generatePdf = (htmlContent: string): Promise<Blob> => {
    return new Promise((resolve) => {
        const doc = new jsPDF('p', 'pt', 'a4');
        const element = document.createElement('div');
        element.innerHTML = htmlContent;
        // Style element to match A4 width roughly for converting
        element.style.width = '550pt';
        element.style.fontFamily = 'serif';
        element.style.fontSize = '12pt';
        element.style.lineHeight = '1.5';
        element.style.padding = '20px';

        document.body.appendChild(element);

        doc.html(element, {
            callback: (doc) => {
                document.body.removeChild(element);
                resolve(doc.output('blob'));
            },
            x: 20,
            y: 20,
            width: 555,
            windowWidth: 600,
            autoPaging: 'text'
        });
    });
};
