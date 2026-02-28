import { resolveIdentity, upgradeIdentity } from "./identity-resolver";

export interface AnalyticsResult {
    classHealth: {
        average: number;
        highest: number;
        lowest: number;
        passRate: number;
        totalStudents: number;
    };
    bottlenecks: {
        question: string;
        failureRate: number;
        avgScore: number;
        maxScore: number;
    }[];
    studentTimeline: {
        studentName: string;
        data: { session: string; score: number; date: string }[];
    }[];
}

/**
 * World-Class Analytics Engine
 * Encapsulates the heavy computational logic for Class Analytics to prevent UI thread blocking
 * and standardize metric generation.
 */
export function computeClassAnalytics(submissions: any[]): AnalyticsResult {
    let totalScoreSum = 0;
    let highest = 0;
    let lowest = 100; // Percentage
    let passCount = 0;
    let totalCount = 0;

    const questionStats: Record<string, { failures: number; count: number; totalScore: number; maxScore: number }> = {};
    const studentMap = new Map<string, { name: string; data: any[], primaryName: string, secondaryInfo: string }>();

    submissions.forEach(sub => {
        if (!sub.score) return;

        const max = sub.workSession.totalMarks || 100;
        const score = sub.score.totalMarks;
        const percentage = max > 0 ? (score / max) * 100 : 0;

        // --- Class Health ---
        totalScoreSum += percentage;
        totalCount++;
        if (percentage > highest) highest = percentage;
        if (percentage < lowest) lowest = percentage;
        if (percentage >= 50) passCount++;

        // --- Identity Resolution (Timeline) ---
        const identity = resolveIdentity(sub);
        const key = identity.key;

        if (!studentMap.has(key)) {
            studentMap.set(key, {
                name: identity.primaryName,
                primaryName: identity.primaryName,
                secondaryInfo: identity.secondaryInfo,
                data: []
            });
        }

        const student = studentMap.get(key)!;
        upgradeIdentity(student, identity);
        student.name = student.primaryName; // Commit name upgrade

        student.data.push({
            session: sub.workSession.title,
            score: Math.round(percentage),
            date: sub.submittedAt?.toISOString() || new Date().toISOString()
        });

        // --- Bottleneck Analysis ---
        try {
            const breakdown = JSON.parse(sub.score.breakdown);
            if (Array.isArray(breakdown)) {
                breakdown.forEach((q: any) => {
                    const qName = `${sub.workSession.title}: ${q.question || "Q"}`;

                    if (!questionStats[qName]) {
                        questionStats[qName] = { failures: 0, count: 0, totalScore: 0, maxScore: q.max || 10 };
                    }

                    questionStats[qName].count++;
                    questionStats[qName].totalScore += q.score || 0;

                    // Failure threshold: strictly < 50%
                    if (q.score < (q.max * 0.5)) {
                        questionStats[qName].failures++;
                    }
                });
            }
        } catch (e) {
            // Ignore parse errors on individual submissions to prevent crashing the batch
        }
    });

    const average = totalCount > 0 ? totalScoreSum / totalCount : 0;
    const passRate = totalCount > 0 ? (passCount / totalCount) * 100 : 0;
    if (totalCount === 0) lowest = 0;

    const bottlenecks = Object.entries(questionStats)
        .map(([q, stats]) => {
            const avg = stats.count > 0 ? (stats.totalScore / stats.count) : 0;
            return {
                question: q,
                failureRate: Math.round((stats.failures / stats.count) * 100),
                avgScore: parseFloat(avg.toFixed(1)),
                maxScore: stats.maxScore
            };
        })
        .sort((a, b) => b.failureRate - a.failureRate)
        .slice(0, 5); // Top 5

    const studentTimeline = Array.from(studentMap.values()).map(s => ({
        studentName: s.name,
        data: s.data
    }));

    return {
        classHealth: {
            average: parseFloat(average.toFixed(1)),
            highest: Math.round(highest),
            lowest: Math.round(lowest),
            passRate: parseFloat(passRate.toFixed(1)),
            totalStudents: studentTimeline.length
        },
        bottlenecks,
        studentTimeline
    };
}
