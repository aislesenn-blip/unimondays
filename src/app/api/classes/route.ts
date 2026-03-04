import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db/prisma";

export async function POST(req: Request) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, code } = body;

    if (!name || !code) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        code,
        lecturerId: userId,
      },
    });

    return NextResponse.json(newClass);
  } catch (error) {
    console.error("[CLASSES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
