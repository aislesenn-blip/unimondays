export function getClassAnalytics(submissions: any[]) {
    return {
        classHealth: {
            average: 0,
            passRate: 0,
            highest: 0,
            lowest: 0
        },
        bottlenecks: [],
        studentTimeline: []
    }
}
