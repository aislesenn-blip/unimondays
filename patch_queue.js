import fs from 'fs';

const file = 'src/app/api/queue/process/route.ts';
let code = fs.readFileSync(file, 'utf8');

// The original logic inside the processing loop was:
//
//            // EXECUTE WORKER BASED ON TYPE
//            if (job.type === 'CLOUD_MARKING') {
//                await handleCloudMarking(job);
//            } else if (job.type === 'AI_GRADE_SUBMISSION') {
//                await handleAiGrade(job);
//            } else {
//                throw new Error(`Unknown Job Type: ${job.type}`);
//            }
//
//            // Mark COMPLETED
//            await prisma.job.update({
//                where: { id: job.id },
//                data: { status: 'COMPLETED', result: 'Success' }
//            });
//            processedCount++;

// But wait, there is a previous patch I tried which failed, let's just make sure.

const targetCode = `            // EXECUTE WORKER BASED ON TYPE
            if (job.type === 'CLOUD_MARKING') {
                await handleCloudMarking(job);
            } else if (job.type === 'AI_GRADE_SUBMISSION') {
                await handleAiGrade(job);
            } else {
                throw new Error(\`Unknown Job Type: \${job.type}\`);
            }

            // Mark COMPLETED
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'COMPLETED', result: 'Success' }
            });
            processedCount++;`;

const replacementCode = `            // EXECUTE WORKER BASED ON TYPE
            let jobResult: any = null;
            if (job.type === 'CLOUD_MARKING') {
                jobResult = await handleCloudMarking(job);
            } else if (job.type === 'AI_GRADE_SUBMISSION') {
                jobResult = await handleAiGrade(job);
            } else {
                throw new Error(\`Unknown Job Type: \${job.type}\`);
            }

            // Support Job Continuations
            if (jobResult && jobResult.continuation) {
                console.log(\`[QUEUE] Job \${job.id} requested continuation for phase \${jobResult.nextPayload?.phase}\`);
                await prisma.job.update({
                    where: { id: job.id },
                    data: {
                        payload: JSON.stringify(jobResult.nextPayload),
                        status: 'PENDING' // Keep it pending so the next queue iteration picks it up
                    }
                });
                processedCount++;
            } else {
                // Mark COMPLETED
                await prisma.job.update({
                    where: { id: job.id },
                    data: { status: 'COMPLETED', result: 'Success' }
                });
                processedCount++;
            }`;

if (code.includes('await handleCloudMarking(job);')) {
    // If the target block isn't fully matched, we'll try to find the segment
    const regex = /\/\/ EXECUTE WORKER BASED ON TYPE[\s\S]*?processedCount\+\+;/m;
    if (regex.test(code)) {
        code = code.replace(regex, replacementCode);
        fs.writeFileSync(file, code);
        console.log("Queue patched successfully.");
    } else {
        console.error("Regex did not match.");
    }
}
