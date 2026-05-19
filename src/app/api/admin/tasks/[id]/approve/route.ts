import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const task = await prisma.task.update({
      where: { id },
      data: { status: "OPEN" },
      include: { user: { select: { email: true } } }
    });

    // Notify User
    const { sendTaskStatusUpdate } = await import("@/lib/mail");
    sendTaskStatusUpdate(task.user.email, task.title, "OPEN").catch(console.error);

    return NextResponse.json(task);
  } catch (error) {
    console.error("Task Approval Error:", error);
    return NextResponse.json({ error: "Failed to approve task" }, { status: 500 });
  }
}
