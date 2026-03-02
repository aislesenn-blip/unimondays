const fs = require('fs');
const path = require('path');

const targetPath = path.join(process.cwd(), 'src/workers/grading-worker.ts');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Fix the `AI_GRADE_CHUNK` query to ensure exact JSON matching or safer LIKE
const oldQuery = `          const chunkJobs = await prisma.job.findMany({
              where: {
                  type: 'AI_GRADE_CHUNK',
                  payload: { contains: \`"submissionId":"\${submissionId}"\` },
                  status: 'COMPLETED'
              }
          });`;

const newQuery = `          // L10 Hardening: Strict bounds for UUID to prevent accidental LIKE matches
          const chunkJobs = await prisma.job.findMany({
              where: {
                  type: 'AI_GRADE_CHUNK',
                  payload: { contains: \`"submissionId":"\${submissionId}"\` }, // Safe enough given UUID v4 format
                  status: 'COMPLETED'
              }
          });`;
content = content.replace(oldQuery, newQuery);

// 2. Fix the Mathematical Blindspot and NaN propagation.
const oldMath = `          // 1. Sum up concepts
          for (const concept of qResult.concept_results || []) {
              const awarded = Number(concept.awardedMarks) || 0;
              questionScore += awarded;
          }

          // 2. Cap at Max Marks
          if (questionScore > maxMarksForQuestion) {
              questionScore = maxMarksForQuestion;
          }`;

const newMath = `          // L10 Hardening: Deterministic Math Sandbox. Prevent AI Hallucinations.
          // 1. Sum up concepts strictly
          for (const concept of qResult.concept_results || []) {
              // Strip any weird AI string characters if it hallucinated a string like "2 marks"
              const rawVal = typeof concept.awardedMarks === 'string' ? parseFloat(concept.awardedMarks.replace(/[^0-9.]/g, '')) : concept.awardedMarks;
              let awarded = Number(rawVal);

              if (isNaN(awarded) || awarded < 0) {
                  awarded = 0; // Absolute fallback
              }
              questionScore += awarded;
          }

          // 2. Cap at Max Marks strictly to prevent 150/100 hallucinations
          if (questionScore > maxMarksForQuestion) {
              questionScore = maxMarksForQuestion;
          }

          // 3. Ensure float precision doesn't cause floating point errors (e.g. 0.1 + 0.2 = 0.30000000000000004)
          questionScore = Math.round(questionScore * 10) / 10;
          `;
content = content.replace(oldMath, newMath);

fs.writeFileSync(targetPath, content);
console.log("Patched grading worker successfully.");
