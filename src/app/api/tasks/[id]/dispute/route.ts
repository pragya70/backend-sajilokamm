import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/unifiedAuth";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() { return optionsResponse(); }

// Either poster or tasker can open a dispute on an IN_PROGRESS task
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(req);
  if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });

  const userId = user.id;
  const { id: taskId } = await params;
  const { reason } = await req.json().catch(() => ({ reason: "" }));

  if (!reason?.trim()) return corsJson({ error: "Reason is required" }, { status: 400 });

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

  if (!task) return corsJson({ error: "Task not found" }, { status: 404 });

  const isPoster = task.userId === userId;
  const isTasker = task.offers[0]?.userId === userId;

  if (!isPoster && !isTasker) return corsJson({ error: "Forbidden" }, { status: 403 });
  if (task.status !== "IN_PROGRESS") return corsJson({ error: "Disputes can only be opened on in-progress tasks" }, { status: 400 });
  if (task.disputeStatus === "OPEN") return corsJson({ error: "A dispute is already open" }, { status: 400 });

  await prisma.task.update({
    where: { id: taskId },
    data: {
      disputeOpenedBy: userId,
      disputeReason: reason,
      disputeOpenedAt: new Date(),
      disputeStatus: "OPEN",
    },
  });

  // Notify admin via notification + email
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, email: true } });
  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: "DISPUTE_OPENED",
        title: "Dispute Opened",
        message: `A dispute was opened on task "${task.title}"`,
        data: { taskId },
      },
    });
  }

  // Notify the other party
  const otherPartyId = isPoster ? task.offers[0]?.userId : task.userId;
  if (otherPartyId) {
    await prisma.notification.create({
      data: {
        userId: otherPartyId,
        type: "DISPUTE_OPENED",
        title: "Dispute Opened",
        message: `A dispute has been opened on task "${task.title}". An admin will review.`,
        data: { taskId },
      },
    });
  }

  return corsJson({ success: true });
}
