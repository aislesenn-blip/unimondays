export type StandardizedRubric = {
    ExamTitle: string;
    CourseCode: string;
    ExamDate: string;
    TotalMarks: number;
    NumberOfQuestions: number;
    Questions: any[];
};

export async function standardizeRubric(rubricText: string): Promise<StandardizedRubric> {
    return {
        ExamTitle: "Standardized Rubric",
        CourseCode: "CS101",
        ExamDate: new Date().toISOString(),
        TotalMarks: 100,
        NumberOfQuestions: 0,
        Questions: []
    }
}
