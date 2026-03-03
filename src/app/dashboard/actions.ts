'use server'

import { prisma } from "@/lib/prisma";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getClasses(lecturerId: string) {
  const classes = await prisma.class.findMany({
    where: { lecturerId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { workSessions: true }
      }
    }
  });

  return classes;
}

export async function createClass(formData: FormData) {
  const className = formData.get("name") as string;
  const classCode = formData.get("code") as string;
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to create a class." };
  }

  try {
    await prisma.class.create({
      data: {
        name: className,
        code: classCode,
        lecturerId: user.id,
      },
    });
  } catch (error) {
    return { error: "Failed to create class." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

function generateWorkCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createWorkSession(formData: FormData) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to create a work session.' };
  }

  const title = formData.get('title') as string;
  const classId = formData.get('classId') as string;
  const deadline = formData.get('deadline') as string;
  const releaseMode = formData.get('releaseMode') as string;
  const rubricFile = formData.get('rubricFile') as File;
  const standardizedRubric = formData.get('standardizedRubric') as string;

  let rubricPath = null;

  if (rubricFile && rubricFile.size > 0) {
    const fileName = `${user.id}/${classId}/${Date.now()}-${rubricFile.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('rubrics_bucket')
      .upload(fileName, rubricFile);

    if (uploadError) {
      console.error("Storage Error:", uploadError);
      return { error: "Failed to upload rubric file." };
    }
    rubricPath = uploadData.path;
  }
  
  const workCode = generateWorkCode();

  try {
    const workSession = await prisma.workSession.create({
      data: {
        title,
        classId,
        deadline: deadline ? new Date(deadline) : null,
        lecturerId: user.id,
        workCode,
        releaseMode: releaseMode === 'manual' ? 'MANUAL' : 'IMMEDIATE',
      }
    });

    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/classes/${classId}`);
    return { success: true, workSession };

  } catch (e: any) {
    console.error("Prisma Error:", e);
    return { error: 'Failed to create work session.' };
  }
}
