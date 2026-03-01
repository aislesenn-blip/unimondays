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

        // Validate TotalMarks and NumberOfQuestions
        if (rubric.TotalMarks === undefined || Number.isNaN(Number(rubric.TotalMarks)) || Number(rubric.TotalMarks) <= 0) {
            return NextResponse.json({ error: "Validation Error: TotalMarks is missing or invalid." }, { status: 400 });
        }
        if (rubric.NumberOfQuestions === undefined || Number.isNaN(Number(rubric.NumberOfQuestions)) || Number(rubric.NumberOfQuestions) <= 0) {
            return NextResponse.json({ error: "Validation Error: NumberOfQuestions is missing or invalid." }, { status: 400 });
        }

        // Validate individual questions for marksAllocated
        for (const [index, q] of rubric.Questions.entries()) {
            if (q.MarksAllocated === undefined || Number.isNaN(Number(q.MarksAllocated)) || Number(q.MarksAllocated) < 0) {
                return NextResponse.json({ error: `Validation Error: Question ${q.QuestionID || index + 1} is missing allocated marks.` }, { status: 400 });
            }
        }

        const savedRubric = await prisma.$transaction(async (tx) => {
            try {
                const newRubric = await tx.standardizedRubric.create({
                    data: {
                        lecturerId: user.id,
                        examTitle: rubric.ExamTitle || "Untitled Exam",
                        courseCode: rubric.CourseCode || "N/A",
                        examDate: new Date(rubric.ExamDate || new Date().toISOString()),
                        totalMarks: Number(rubric.TotalMarks),
                        numberOfQuestions: Number(rubric.NumberOfQuestions),
                    }
                });

                for (const q of rubric.Questions) {
                    let question;
                    try {
                        question = await tx.rubricQuestion.create({
                            data: {
                                standardizedRubricId: newRubric.id,
                                questionId: q.QuestionID || `Q-${Math.random().toString(36).substr(2, 5)}`,
                                questionText: q.QuestionText || "",
                                marksAllocated: Number(q.MarksAllocated),
                                questionType: q.QuestionType || "Essay",
                                learningObjective: q.LearningObjective || "",
                                mcqOptions: q.MCQOptions ? JSON.stringify(q.MCQOptions) : null,
                            }
                        });
                    } catch (err: any) {
                        console.error(`[TX FATAL] Failed to insert RubricQuestion ${q.QuestionID}:`, err);
                        throw new Error(`Failed to insert question ${q.QuestionID}: ${err.message}`);
                    }

                    if (q.ConceptUnits && q.ConceptUnits.length > 0) {
                        try {
                            await tx.conceptUnit.createMany({
                                data: q.ConceptUnits.map(cu => ({
                                    rubricQuestionId: question.id,
                                    conceptId: cu.ConceptID || `C-${Math.random().toString(36).substr(2, 5)}`,
                                    conceptText: cu.ConceptText || "",
                                    marks: Number(cu.Marks) || 0,
                                    partialRule: cu.PartialRule || null
                                }))
                            });
                        } catch (err: any) {
                            console.error(`[TX FATAL] Failed to insert ConceptUnits for ${q.QuestionID}:`, err);
                            throw new Error(`Failed to insert concept units for ${q.QuestionID}: ${err.message}`);
                        }
                    }

                    if (q.EvaluationTiers) {
                        try {
                            await tx.evaluationTier.createMany({
                                data: [
                                    { rubricQuestionId: question.id, tierName: "Tier1", description: q.EvaluationTiers.Tier1 || "" },
                                    { rubricQuestionId: question.id, tierName: "Tier2", description: q.EvaluationTiers.Tier2 || "" },
                                    { rubricQuestionId: question.id, tierName: "Tier3", description: q.EvaluationTiers.Tier3 || "" }
                                ]
                            });
                        } catch (err: any) {
                            console.error(`[TX FATAL] Failed to insert EvaluationTiers for ${q.QuestionID}:`, err);
                            throw new Error(`Failed to insert evaluation tiers for ${q.QuestionID}: ${err.message}`);
                        }
                    }

                    if (q.OutOfScope && q.OutOfScope.length > 0) {
                        try {
                            await tx.outOfScopeRule.createMany({
                                data: q.OutOfScope.map(os => ({
                                    rubricQuestionId: question.id,
                                    description: os.Description || "",
                                    maxMarks: Number(os.MaxMarks) || 0
                                }))
                            });
                        } catch (err: any) {
                            console.error(`[TX FATAL] Failed to insert OutOfScopeRules for ${q.QuestionID}:`, err);
                            throw new Error(`Failed to insert out-of-scope rules for ${q.QuestionID}: ${err.message}`);
                        }
                    }

                    if (q.Penalties && q.Penalties.length > 0) {
                        try {
                            await tx.penaltyRule.createMany({
                                data: q.Penalties.map(p => ({
                                    rubricQuestionId: question.id,
                                    description: p.Description || "",
                                    deduct: Number(p.Deduct) || 0
                                }))
                            });
                        } catch (err: any) {
                            console.error(`[TX FATAL] Failed to insert PenaltyRules for ${q.QuestionID}:`, err);
                            throw new Error(`Failed to insert penalties for ${q.QuestionID}: ${err.message}`);
                        }
                    }
                }

                return newRubric;
            } catch (txError: any) {
                console.error("[TX ABORT] Transaction completely aborted:", txError);
                throw txError;
            }
        }, {
            maxWait: 10000, // wait maximum of 10s for transaction
            timeout: 20000, // timeout entire transaction at 20s
        });


        return NextResponse.json({ success: true, rubricId: savedRubric.id });

    } catch (error: any) {
         console.error("Save Rubric API Error:", error);
         return NextResponse.json({ error: error.message || "Failed to save rubric" }, { status: 500 });
    }
}
