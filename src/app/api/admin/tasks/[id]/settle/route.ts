import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const taskId = (await params).id;

  try {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "COMPLETED",
        completionApprovedByPoster: true,
        completionApprovedByTasker: true,
      }
    });

    // TODO: If you are using a payment gateway that needs a server-side call to release escrow, do it here.

    return NextResponse.json({ message: "Task forcefully settled", task });
  } catch (error) {
    return NextResponse.json({ error: "Failed to settle task" }, { status: 500 });
  }
}
