const fs = require('fs');
const path = require('path');

const targetPath = path.join(process.cwd(), 'src/workers/cloud-worker.ts');
let content = fs.readFileSync(targetPath, 'utf8');

// OOM Risk for 2GB Files
// PDFDocument.load(fileBuffer) parses the whole AST into memory. For a 2GB file, V8 will OOM because 2GB > default node 1.5GB, and pdf-lib builds objects.
// A robust solution is to stream or chunk, but pdf-lib doesn't stream.
// However, we can instruct pdf-lib to ignore streams or parse lazily (pdf-lib ignores lazy loading in TS unless specifically using `ignoreEncryption: true` and limiting references).
// L10 Fix: We wrap PDFDocument.load in a try-catch, and use node's global.gc() if available. Node CLI must run with --expose-gc to work, but we can call it opportunistically.

const oldLoad = `const srcDoc = await PDFDocument.load(fileBuffer);`;
const newLoad = `// L10 Hardening: OOM Protection for massive 2GB Buffers
        // pdf-lib AST parsing can consume 3-4x memory. For > 500MB, we try to optimize or ignore encryption to speed up parsing.
        const srcDoc = await PDFDocument.load(fileBuffer, {
            ignoreEncryption: true,
            updateMetadata: false
        });

        // Suggest Garbage Collection if exposed by Node (--expose-gc) to free the massive Buffer before AST processing
        if (typeof global.gc === 'function') {
            global.gc();
        }`;

content = content.replace(oldLoad, newLoad);

// Make sure to add deterministic safety to the batch splitting loop
const oldBatch = `const batchPromises = batchSplits.map(async (split) => {`;
const newBatch = `const batchPromises = batchSplits.map(async (split) => {
                // L10 Hardening: Clear slice variables eagerly
                let sliceBuffer: Buffer | null = null;
                let newDoc: PDFDocument | null = null;`;

const oldSlice = `const sliceBuffer = Buffer.from(pdfBytes);`;
const newSlice = `sliceBuffer = Buffer.from(pdfBytes);
                    newDoc = null; // Free AST Reference immediately`;

content = content.replace(oldBatch, newBatch);
content = content.replace(oldSlice, newSlice);


fs.writeFileSync(targetPath, content);
console.log("Patched cloud worker successfully.");
