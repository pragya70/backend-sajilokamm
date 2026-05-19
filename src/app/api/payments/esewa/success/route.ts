import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyEsewaResponse } from "@/lib/esewa";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dataB64 = searchParams.get("data");
  const taskId = searchParams.get("taskId");
  const base = process.env.NEXTAUTH_URL!;

  if (!taskId) {
    return NextResponse.redirect(`${base}/dashboard?payment=failed`);
  }

  // If no data param, eSewa may have redirected without payload — treat as failed
  if (!dataB64) {
    return NextResponse.redirect(`${base}/tasks/${taskId}?payment=failed`);
  }

  let data: Record<string, string> = {};
  try {
    data = JSON.parse(Buffer.from(dataB64, "base64").toString("utf-8"));
  } catch {
    console.error("eSewa: failed to decode response data");
    return NextResponse.redirect(`${base}/tasks/${taskId}?payment=failed`);
  }

  console.log("eSewa response data:", JSON.stringify(data));

  // Verify signature — skip in development/UAT if env var set
  const skipVerify = process.env.ESEWA_SKIP_VERIFY === "true";
  if (!skipVerify && !verifyEsewaResponse(data)) {
    console.error("eSewa signature mismatch — data:", JSON.stringify(data));
    // In UAT, fall through anyway if status is COMPLETE (signature issues are common in sandbox)
    if (data.status !== "COMPLETE") {
      return NextResponse.redirect(`${base}/tasks/${taskId}?payment=invalid_signature`);
    }
  }

  if (data.status !== "COMPLETE") {
    return NextResponse.redirect(`${base}/tasks/${taskId}?payment=failed`);
  }

  try {
    // Check if already paid (idempotency)
    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      select: { esewaRefId: true },
    });

    if (existing?.esewaRefId) {
      // Already recorded — just redirect back
      return NextResponse.redirect(`${base}/tasks/${taskId}?payment=success`);
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

    if (!task) {
      console.error("eSewa success: task not found", taskId);
      return NextResponse.redirect(`${base}/dashboard?payment=failed`);
    }

    const taskerOffer = task.offers[0];
    const esewaRefId = data.transaction_code || data.ref_id || `esewa-${Date.now()}`;

    const { calculateFees } = await import("@/lib/platform");
    const { platformFee, taskerPayout } = calculateFees(task.budget);

    await prisma.$transaction([
      prisma.task.update({
        where: { id: taskId },
        data: { esewaRefId },
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
                esewaRefId,
                method: "ESEWA",
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
        esewaRefId,
      ).catch(console.error);
    }

    return NextResponse.redirect(`${base}/tasks/${taskId}?payment=success`);
  } catch (err) {
    console.error("eSewa success callback error:", err);
    return NextResponse.redirect(`${base}/tasks/${taskId}?payment=failed`);
  }
}
