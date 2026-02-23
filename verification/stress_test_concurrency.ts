import "dotenv/config";
import fs from "fs";
import fetch from "node-fetch";
import FormData from "form-data";
import { PDFDocument } from "pdf-lib";

const BASE_URL = "http://localhost:3000";

async function createSmallPDF(id: number) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    page.drawText(`Concurrent Test ${id}`);
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}

async function runConcurrencyTest() {
    console.log("🚀 Starting Concurrency Stress Test (20 uploads)...");

    const requests = [];
    for (let i = 0; i < 20; i++) {
        requests.push((async () => {
            const buffer = await createSmallPDF(i);
            const form = new FormData();
            form.append("file", buffer, { filename: `concurrent_${i}.pdf` });

            const start = Date.now();
            const res = await fetch(`${BASE_URL}/api/upload`, {
                method: "POST",
                body: form as any
            });
            const end = Date.now();

            if (res.ok) {
                console.log(`✅ Req ${i}: Success (${end - start}ms)`);
                return true;
            } else {
                console.error(`❌ Req ${i}: Failed`);
                return false;
            }
        })());
    }

    const results = await Promise.all(requests);
    const successCount = results.filter(Boolean).length;

    console.log(`🏁 Finished. Success: ${successCount}/20`);
}

runConcurrencyTest();
