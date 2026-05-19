import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Admin resolves dispute: "POSTER" = refund poster, "TASKER" = release to tasker
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: taskId } = await params;
  const { resolution, note } = await req.json(); // resolution: "POSTER" | "TASKER"

  if (!["POSTER", "TASKER"].includes(resolution)) {
    return NextResponse.json({ error: "Resolution must be POSTER or TASKER" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      user: { select: { id: true, email: true, name: true } },
      offers: {
        where: { status: "ACCEPTED" },
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (task.disputeStatus !== "OPEN") return NextResponse.json({ error: "No open dispute" }, { status: 400 });

  const newStatus = resolution === "TASKER" ? "COMPLETED" : "CANCELLED";

  await prisma.task.update({
    where: { id: taskId },
    data: {
      disputeStatus: `RESOLVED_${resolution}`,
      status: newStatus,
    },
  });

  // Notify both parties
  const tasker = task.offers[0];
  const notifications = [
    prisma.notification.create({
      data: {
        userId: task.userId,
        type: "DISPUTE_RESOLVED",
        title: "Dispute Resolved",
        message: `The dispute on "${task.title}" was resolved in favour of the ${resolution === "POSTER" ? "Poster (you)" : "Tasker"}.${note ? ` Note: ${note}` : ""}`,
        data: { taskId },
      },
    }),
  ];
  if (tasker) {
    notifications.push(
      prisma.notification.create({
        data: {
          userId: tasker.userId,
          type: "DISPUTE_RESOLVED",
          title: "Dispute Resolved",
          message: `The dispute on "${task.title}" was resolved in favour of the ${resolution === "TASKER" ? "Tasker (you)" : "Poster"}.${note ? ` Note: ${note}` : ""}`,
          data: { taskId },
        },
      }),
    );
  }
  await Promise.all(notifications);

  return NextResponse.json({ success: true, newStatus });
}
