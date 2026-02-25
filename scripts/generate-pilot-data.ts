
import { PrismaClient } from '@prisma/client';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Data Generation...");

  // 1. Setup University
  const uni = await prisma.university.upsert({
    where: { code: "NU" },
    update: {},
    create: {
      name: "National University",
      code: "NU",
      domain: "nu.edu"
    }
  });

  // 2. Setup Lecturer
  const lecturer = await prisma.user.upsert({
    where: { email: "lecturer@nu.edu" },
    update: {},
    create: {
      email: "lecturer@nu.edu",
      fullName: "Prof. Pilot",
      role: "lecturer",
      universityId: uni.id,
      password: "password123"
    }
  });

  console.log(`Lecturer: ${lecturer.email} (ID: ${lecturer.id})`);

  // 3. Setup Class
  const semester = await prisma.classes.upsert({
    where: { code: "SEM1" },
    update: {},
    create: {
      name: "Semester 1 - 1000 Students",
      code: "SEM1",
      lecturerId: lecturer.id,
      universityId: uni.id,
      status: "ACTIVE"
    }
  });

  // 4. Setup Quiz
  const quiz = await prisma.quiz.upsert({
    where: { code: "FINAL24" },
    update: {},
    create: {
      title: "Final Exam 2024",
      code: "FINAL24",
      lecturerId: lecturer.id,
      classId: semester.id,
      status: "PUBLISHED",
      totalMarks: 100,
      rubric: "Grade based on clarity, depth of understanding, and critical thinking."
    }
  });

  console.log(`Class: ${semester.name}, Quiz: ${quiz.title} (ID: ${quiz.id})`);

  // 5. Create 1000 Students
  console.log("Creating 1000 Students...");
  // Clear existing students to avoid conflicts
  await prisma.user.deleteMany({ where: { role: 'student', universityId: uni.id } });

  const students = [];
  for (let i = 1; i <= 1000; i++) {
    students.push({
      email: `student${i}@nu.edu`,
      fullName: `Student ${i}`,
      role: "student",
      universityId: uni.id,
      quota: 100
    });
  }

  // Batch insert
  for (let i = 0; i < students.length; i += 100) {
    await prisma.user.createMany({
      data: students.slice(i, i + 100)
    });
  }
  console.log("1000 Students created.");

  // 6. Generate Batch PDF (5 Students * 15 Pages = 75 Pages)
  console.log("Generating Batch PDF (75 pages)...");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= 5; i++) {
    const regNo = `STU-00${i}`;
    console.log(`Generating 15 pages for ${regNo}...`);

    for (let pageNum = 1; pageNum <= 15; pageNum++) {
      const page = doc.addPage();
      const { width, height } = page.getSize();

      // Header on First Page of Script
      if (pageNum === 1) {
        page.drawText(`RegNo: ${regNo}`, { x: 50, y: height - 50, size: 24, font });
        page.drawText(`Student Name: Student ${i}`, { x: 50, y: height - 80, size: 18, font });
        page.drawText(`Subject: Final Exam 2024`, { x: 50, y: height - 110, size: 18, font });
      }

      page.drawText(`Page ${pageNum} of 15`, { x: width - 100, y: 30, size: 12, font });

      const content = `
        Question 1: Discuss the impact of AI on modern education.

        Artificial Intelligence (AI) is transforming the educational landscape...
        (Simulated essay content for page ${pageNum})...

        The integration of AI tools like Large Language Models (LLMs) offers personalized learning...
        However, challenges such as academic integrity and data privacy remain...

        Critical analysis of the subject reveals that...
      `;

      page.drawText(content, { x: 50, y: height - 150, size: 12, font, maxWidth: width - 100, lineHeight: 20 });
    }
  }

  const pdfBytes = await doc.save();
  fs.writeFileSync('pilot-batch.pdf', pdfBytes);
  console.log("pilot-batch.pdf generated successfully.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
