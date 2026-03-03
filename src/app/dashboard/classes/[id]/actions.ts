'use server'

export async function getClassDetails(classId: string) {
    return {
        id: classId,
        code: "CS101",
        name: "Intro to Computer Science",
        lecturerId: "123",
        workSessions: [] as any[]
    }
}

export async function getCAData(classId: string): Promise<any[]> {
    return [];
}
