import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/unifiedAuth";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() { return optionsResponse(); }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser(req);
  if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: {
      task: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!offer) return corsJson({ error: "Offer not found" }, { status: 404 });

  const posterId = user.id;
  const poster = await prisma.user.findUnique({
    where: { id: posterId },
    select: { verificationStatus: true },
  });

  if (poster?.verificationStatus !== "VERIFIED") {
    return corsJson({
      error: "KYC Verification Required",
      message: "Please complete your identity verification in the dashboard to accept offers.",
    }, { status: 403 });
  }

  if (offer.task.userId !== posterId) return corsJson({ error: "Forbidden" }, { status: 403 });
  if (offer.task.status !== "OPEN") return corsJson({ error: "Task is no longer open" }, { status: 400 });

  // Get all OTHER offers (to be rejected) with their tasker info
  const otherOffers = await prisma.offer.findMany({
    where: { taskId: offer.taskId, id: { not: id } },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // Run the transaction: accept one, reject all others, update task
  await prisma.$transaction([
    prisma.offer.update({ where: { id }, data: { status: "ACCEPTED" } }),
    prisma.offer.updateMany({
      where: { taskId: offer.taskId, id: { not: id } },
      data: { status: "REJECTED" },
    }),
    prisma.task.update({
      where: { id: offer.taskId },
      data: { status: "IN_PROGRESS", budget: offer.price },
    }),
  ]);

  const taskTitle = offer.task.title;
  const taskId = offer.task.id;

  // ── Notify & email the ACCEPTED tasker ──
  prisma.notification.create({
    data: {
      userId: offer.user.id,
      type: "OFFER_ACCEPTED",
      title: "Your Offer Was Accepted! 🎉",
      message: `Congratulations! Your offer on "${taskTitle}" has been accepted. You can now start working on the task.`,
      data: { taskId },
    },
  }).catch(console.error);

  // ── Notify & email each REJECTED tasker ──
  const { sendOfferRejectedEmail } = await import("@/lib/mail");

  for (const rejected of otherOffers) {
    // In-app notification
    prisma.notification.create({
      data: {
        userId: rejected.user.id,
        type: "OFFER_ACCEPTED", // reuse closest type
        title: "Offer Not Selected",
        message: `Thank you for your offer on "${taskTitle}". The poster has selected another tasker. We hope to connect you with future opportunities!`,
        data: { taskId },
      },
    }).catch(console.error);

    // Email notification
    sendOfferRejectedEmail(
      rejected.user.email,
      rejected.user.name,
      taskTitle,
    ).catch(console.error);
  }

  return corsJson({ success: true });
}
