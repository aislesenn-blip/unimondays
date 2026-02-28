import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StandardizedRubric } from "@/lib/ai/rubric-standardizer";

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== "LECTURER") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rubric: StandardizedRubric = await req.json();

        if (!rubric || !rubric.ExamTitle || !rubric.Questions) {
             return NextResponse.json({ error: "Invalid Rubric payload" }, { status: 400 });
        }

        const savedRubric = await prisma.$transaction(async (tx) => {
            const newRubric = await tx.standardizedRubric.create({
                data: {
                    lecturerId: user.id,
                    examTitle: rubric.ExamTitle,
                    courseCode: rubric.CourseCode,
                    examDate: new Date(rubric.ExamDate || new Date().toISOString()),
                    totalMarks: rubric.TotalMarks,
                    numberOfQuestions: rubric.NumberOfQuestions,
                }
            });

            for (const q of rubric.Questions) {
                const question = await tx.rubricQuestion.create({
                    data: {
                        standardizedRubricId: newRubric.id,
                        questionId: q.QuestionID,
                        questionText: q.QuestionText,
                        marksAllocated: q.MarksAllocated,
                        questionType: q.QuestionType,
                        learningObjective: q.LearningObjective,
                        mcqOptions: q.MCQOptions ? JSON.stringify(q.MCQOptions) : null,
                    }
                });

                if (q.ConceptUnits && q.ConceptUnits.length > 0) {
                     await tx.conceptUnit.createMany({
                         data: q.ConceptUnits.map(cu => ({
                             rubricQuestionId: question.id,
                             conceptId: cu.ConceptID,
                             conceptText: cu.ConceptText,
                             marks: cu.Marks,
                             partialRule: cu.PartialRule
                         }))
                     });
                }

                if (q.EvaluationTiers) {
                     await tx.evaluationTier.createMany({
                         data: [
                             { rubricQuestionId: question.id, tierName: "Tier1", description: q.EvaluationTiers.Tier1 },
                             { rubricQuestionId: question.id, tierName: "Tier2", description: q.EvaluationTiers.Tier2 },
                             { rubricQuestionId: question.id, tierName: "Tier3", description: q.EvaluationTiers.Tier3 }
                         ]
                     })
                }

                if (q.OutOfScope && q.OutOfScope.length > 0) {
                     await tx.outOfScopeRule.createMany({
                         data: q.OutOfScope.map(os => ({
                             rubricQuestionId: question.id,
                             description: os.Description,
                             maxMarks: os.MaxMarks
                         }))
                     });
                }

                if (q.Penalties && q.Penalties.length > 0) {
                     await tx.penaltyRule.createMany({
                         data: q.Penalties.map(p => ({
                             rubricQuestionId: question.id,
                             description: p.Description,
                             deduct: p.Deduct
                         }))
                     });
                }
            }

            return newRubric;
        });


        return NextResponse.json({ success: true, rubricId: savedRubric.id });

    } catch (error: any) {
         console.error("Save Rubric API Error:", error);
         return NextResponse.json({ error: error.message || "Failed to save rubric" }, { status: 500 });
    }
}
