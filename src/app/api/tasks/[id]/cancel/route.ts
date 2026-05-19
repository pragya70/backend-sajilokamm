import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/unifiedAuth";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() { return optionsResponse(); }

// Cancellation policy:
// - OPEN task (no accepted offer): poster can cancel freely
// - IN_PROGRESS task: poster can cancel but loses 10% penalty (noted, no actual charge since payment is post-completion)
// - Tasker cannot cancel — they can only abandon (which opens a dispute)

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(req);
  if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });

  const userId = user.id;
  const { id: taskId } = await params;
  const { reason } = await req.json().catch(() => ({ reason: "" }));

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      user: { select: { email: true, name: true } },
      offers: {
        where: { status: "ACCEPTED" },
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });

  if (!task) return corsJson({ error: "Task not found" }, { status: 404 });
  if (task.userId !== userId) return corsJson({ error: "Only the poster can cancel this task" }, { status: 403 });
  if (!["OPEN", "IN_PROGRESS"].includes(task.status)) {
    return corsJson({ error: "Task cannot be cancelled in its current state" }, { status: 400 });
  }

  const penalty = task.status === "IN_PROGRESS"; // flag for UI

  await prisma.$transaction([
    prisma.task.update({
      where: { id: taskId },
      data: {
        status: "CANCELLED",
        cancelledBy: userId,
        cancelReason: reason || "Cancelled by poster",
        cancelledAt: new Date(),
        // Reject all pending offers
        offers: { updateMany: { where: { status: "PENDING" }, data: { status: "REJECTED" } } },
      },
    }),
  ]);

  // Notify accepted tasker if IN_PROGRESS
  const tasker = task.offers[0];
  if (tasker) {
    await prisma.notification.create({
      data: {
        userId: tasker.userId,
        type: "TASK_CANCELLED",
        title: "Task Cancelled",
        message: `"${task.title}" has been cancelled by the poster.`,
        data: { taskId },
      },
    });

    const { sendTaskCancelledEmail } = await import("@/lib/mail");
    sendTaskCancelledEmail(
      tasker.user.email,
      tasker.user.name,
      task.title,
      reason || "No reason provided",
      penalty,
    ).catch(console.error);
  }

  return corsJson({ success: true, penalty });
}
