import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { resolveIdentity } from "@/lib/edtech/identity-resolver";
import * as XLSX from "xlsx";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const classData = await prisma.classes.findUnique({
      where: { id },
      include: {
        workSessions: {
          orderBy: { createdAt: "asc" },
          where: { status: { not: "ARCHIVED" }, includeInCalculation: true },
        },
      },
    });

    if (!classData) {
      return new NextResponse("Class Not Found", { status: 404 });
    }

    if (classData.lecturerId !== user.id && user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const submissions = await prisma.submission.findMany({
      where: {
        workSession: { classId: id, includeInCalculation: true },
        status: { in: ["GRADED", "RELEASED", "APPEALED", "FLAGGED"] },
      },
      include: {
        score: true,
        user: true,
        workSession: true,
      },
    });

    // World-Class Fast Aggregation
    const studentMap = new Map();
    const sessions = classData.workSessions;

    submissions.forEach((sub) => {
      const identity = resolveIdentity(sub);
      const key = identity.key;

      if (!studentMap.has(key)) {
        studentMap.set(key, {
          name: identity.primaryName,
          regNo: identity.regNo || identity.secondaryInfo,
          scores: {},
          totalScore: 0,
        });
      }

      const student = studentMap.get(key);

      // Simple Upgrade
      if (
        student.name.startsWith("Unidentified") &&
        !identity.primaryName.startsWith("Unidentified")
      ) {
        student.name = identity.primaryName;
      }
      if (
        (student.regNo === "N/A" || !student.regNo) &&
        identity.secondaryInfo !== "N/A"
      ) {
        student.regNo = identity.secondaryInfo;
      }

      if (sub.score && typeof sub.score.totalMarks === "number") {
        student.scores[sub.workSessionId] = sub.score.totalMarks;
        student.totalScore += sub.score.totalMarks;
      }
    });

    const students = Array.from(studentMap.values());

    // Format for Excel
    const data = students.map((s) => {
      let possibleMax = 0;
      let totalScore = 0;

      const row: any = {
        "Student Name": s.name,
        "Reg No": s.regNo,
      };

      sessions.forEach((sess) => {
        if (sess.includeInCalculation) {
          const score = s.scores[sess.id] || 0;
          totalScore += score;
          possibleMax += sess.totalMarks || 100;
        }
        row[sess.title] =
          s.scores[sess.id] !== undefined ? s.scores[sess.id] : "-";
      });

      row["Total Score"] = totalScore;
      row["Percentage"] =
        possibleMax > 0
          ? `${((totalScore / possibleMax) * 100).toFixed(1)}%`
          : "0.0%";

      return row;
    });

    // Create Excel Book
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CA Sheet");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Stream to client with proper headers
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="CA_Export_${classData.code}.xlsx"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
