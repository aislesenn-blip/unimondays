
import Tesseract from 'tesseract.js';
import { jsPDF } from 'jspdf';

// --- OCR Function ---
export const performOCR = async (
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    const result = await Tesseract.recognize(
      imageFile,
      'eng+swa', // Support English and Swahili if installed, or fallback to eng
      {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(Math.round(m.progress * 100));
          }
        },
      }
    );
    return result.data.text;
  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error("Failed to scan image.");
  }
};

// --- PDF Generation Function ---
export const generatePDF = (content: string, filename: string = 'playbook-notes.pdf') => {
  const doc = new jsPDF();

  // Add Title
  doc.setFontSize(18);
  doc.text("Playbook Notes", 10, 15);

  // Add Content
  doc.setFontSize(12);
  const splitText = doc.splitTextToSize(content, 180);
  doc.text(splitText, 10, 25);

  doc.save(filename);
};
