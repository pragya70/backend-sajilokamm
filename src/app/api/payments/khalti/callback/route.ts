import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lookupKhaltiPayment } from "@/lib/khalti";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  const pidx = searchParams.get("pidx");
  const status = searchParams.get("status");
  const base = process.env.NEXTAUTH_URL!;

  if (!taskId || !pidx) {
    return NextResponse.redirect(`${base}/dashboard?payment=failed`);
  }

  // User canceled
  if (status === "User canceled") {
    return NextResponse.redirect(`${base}/dashboard/tasks/${taskId}?payment=failed`);
  }

  try {
    // Idempotency — already recorded
    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      select: { khaltiPidx: true, esewaRefId: true },
    });
    if (existing?.esewaRefId || (existing?.khaltiPidx && existing.khaltiPidx !== pidx)) {
      return NextResponse.redirect(`${base}/dashboard/tasks/${taskId}?payment=success`);
    }

    // Verify via Khalti lookup API
    const lookup = await lookupKhaltiPayment(pidx);
    console.log("Khalti lookup:", JSON.stringify(lookup));

    if (lookup.status !== "Completed") {
      return NextResponse.redirect(`${base}/dashboard/tasks/${taskId}?payment=failed`);
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

    if (!task) return NextResponse.redirect(`${base}/dashboard?payment=failed`);

    const taskerOffer = task.offers[0];
    const refId = lookup.transaction_id || pidx;

    const { calculateFees } = await import("@/lib/platform");
    const { platformFee, taskerPayout } = calculateFees(task.budget);

    await prisma.$transaction([
      prisma.task.update({
        where: { id: taskId },
        data: { khaltiPidx: pidx },
      }),
      ...(taskerOffer
        ? [
            prisma.transaction.create({
              data: {
                taskId,
                posterId: task.userId,
                taskerId: taskerOffer.userId,
                amount: task.budget,
                platformFee,
                taskerPayout,
                esewaRefId: refId,
                method: "KHALTI",
              },
            }),
          ]
        : []),
    ]);

    if (taskerOffer) {
      const { sendPaymentConfirmationEmail } = await import("@/lib/mail");
      sendPaymentConfirmationEmail(
        task.user.email,
        task.user.name,
        taskerOffer.user.email,
        taskerOffer.user.name,
        task.title,
        task.budget,
        refId,
      ).catch(console.error);
    }

    return NextResponse.redirect(`${base}/dashboard/tasks/${taskId}?payment=success`);
  } catch (err) {
    console.error("Khalti callback error:", err);
    return NextResponse.redirect(`${base}/dashboard/tasks/${taskId}?payment=failed`);
  }
}
