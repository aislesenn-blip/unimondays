import "dotenv/config";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import FormData from "form-data";
import { PDFDocument, StandardFonts } from "pdf-lib";

const BASE_URL = "http://localhost:3000";

async function createLargePDF() {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Create 5 students, 2 pages each = 10 pages
    const students = ["STU001", "STU002", "STU003", "STU004", "STU005"];

    for (const id of students) {
        for (let i = 0; i < 2; i++) {
            const page = pdfDoc.addPage();
            page.drawText(`Reg No: ${id}`, { x: 50, y: 700, size: 20, font });
            page.drawText(`Page ${i + 1} Answer content...`, { x: 50, y: 600, size: 15, font });
        }
    }

    const pdfBytes = await pdfDoc.save();
    const filePath = path.join(process.cwd(), "large_test.pdf");
    fs.writeFileSync(filePath, Buffer.from(pdfBytes));
    return filePath;
}

async function runTest() {
    console.log("🚀 Starting Large PDF Stress Test...");

    const filePath = await createLargePDF();
    const fileStream = fs.createReadStream(filePath);

    const form = new FormData();
    form.append("file", fileStream);
    form.append("quizCode", "STRESS-TEST");

    // 1. Upload
    console.log("📤 Uploading...");

    let res = await fetch(`${BASE_URL}/api/upload`, {
        method: "POST",
        body: form as any
    });

    if (!res.ok) {
        console.error("Upload Failed:", await res.text());
        return;
    }

    const uploadData: any = await res.json();
    console.log("✅ Upload Complete. ID:", uploadData.submissionId);

    // 2. Trigger Process
    console.log("⚙️ Triggering Process...");
    const procRes = await fetch(`${BASE_URL}/api/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: uploadData.submissionId })
    });

    const procData: any = await procRes.json();
    console.log("✅ Process Result:", procData);

    // 3. Poll Results
    console.log("👀 Polling Results...");
    let collatedCount = 0;
    for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const resultsRes = await fetch(`${BASE_URL}/api/results`);
        const results: any = await resultsRes.json();

        // Filter those related to this test (hard to track without parent ID linkage in get results,
        // but we look for STU00X reg nos)
        const found = results.filter((r: any) => r.studentRegNo.startsWith("STU"));
        console.log(`Poll ${i+1}: Found ${found.length} collated scripts`);

        if (found.length >= 5) {
            collatedCount = found.length;
            break;
        }
    }

    if (collatedCount >= 5) {
        console.log("🎉 SUCCESS: Collated 5/5 students correctly.");
    } else {
        console.error("❌ FAIL: Did not collate all students.");
    }
}

runTest();
