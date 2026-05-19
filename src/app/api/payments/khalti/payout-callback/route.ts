import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lookupKhaltiPayment } from "@/lib/khalti";

/**
 * Khalti callback handler for payout payments
 * Called after poster completes Khalti payment for payout
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const transactionId = searchParams.get("transactionId");
  const pidx = searchParams.get("pidx");
  const status = searchParams.get("status");
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";

  console.log("[KHALTI PAYOUT CALLBACK]", { transactionId, pidx, status });

  if (!transactionId || !pidx) {
    return NextResponse.redirect(`${base}/dashboard?payout=failed&error=missing_params`);
  }

  // User canceled
  if (status === "User canceled") {
    // Update payout status to cancelled
    await prisma.payout.updateMany({
      where: {
        transactionId,
        status: "PROCESSING",
      },
      data: {
        status: "CANCELLED",
        failureReason: "User cancelled the payment",
      },
    });
    return NextResponse.redirect(`${base}/transactions?payout=cancelled`);
  }

  try {
    // Find the payout record
    const payout = await prisma.payout.findFirst({
      where: {
        transactionId,
        status: "PROCESSING",
      },
      include: {
        transaction: {
          include: {
            task: true,
            tasker: true,
            poster: true,
          },
        },
      },
    });

    if (!payout) {
      console.error("[KHALTI PAYOUT CALLBACK] Payout not found:", transactionId);
      return NextResponse.redirect(`${base}/transactions?payout=failed&error=payout_not_found`);
    }

    // Verify via Khalti lookup API
    const lookup = await lookupKhaltiPayment(pidx);
    console.log("[KHALTI PAYOUT CALLBACK] Lookup result:", JSON.stringify(lookup));

    if (lookup.status !== "Completed") {
      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: "FAILED",
          failureReason: `Khalti payment status: ${lookup.status}`,
        },
      });
      return NextResponse.redirect(`${base}/transactions?payout=failed&error=payment_incomplete`);
    }

    // Payment successful - update payout and transaction
    await prisma.$transaction([
      // Update payout to completed
      prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: "COMPLETED",
          khaltiTxnId: lookup.transaction_id || pidx,
          completedAt: new Date(),
          processedAt: new Date(),
          notes: `Khalti payment completed. Transaction ID: ${lookup.transaction_id || pidx}. Amount: NPR ${lookup.total_amount / 100}`,
        },
      }),
      // Update transaction to released
      prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: "RELEASED",
          releasedAt: new Date(),
        },
      }),
      // Update task completion approval
      prisma.task.update({
        where: { id: payout.transaction.taskId },
        data: {
          completionApprovedByPoster: true,
        },
      }),
    ]);

    // Create notification for tasker
    await prisma.notification.create({
      data: {
        userId: payout.taskerId,
        type: "PAYMENT_RELEASED",
        title: "Payment Received!",
        message: `${payout.transaction.poster.name} has transferred NPR ${payout.amount} to your Khalti account (${payout.khaltiPhone}) for "${payout.transaction.task.title}".`,
        data: {
          taskId: payout.transaction.taskId,
          transactionId,
          payoutId: payout.id,
          amount: payout.amount,
          khaltiTxnId: lookup.transaction_id || pidx,
        },
        read: false,
      },
    });

    // Send email notification (optional)
    try {
      const { sendPaymentConfirmationEmail } = await import("@/lib/mail");
      await sendPaymentConfirmationEmail(
        payout.transaction.poster.email,
        payout.transaction.poster.name,
        payout.transaction.tasker.email,
        payout.transaction.tasker.name,
        payout.transaction.task.title,
        payout.amount,
        lookup.transaction_id || pidx
      );
    } catch (emailError) {
      console.error("[KHALTI PAYOUT CALLBACK] Email error:", emailError);
      // Don't fail the whole process if email fails
    }

    return NextResponse.redirect(`${base}/payment-success?tx=${transactionId}`);
  } catch (err) {
    console.error("[KHALTI PAYOUT CALLBACK] Error:", err);
    
    // Try to update payout status
    try {
      await prisma.payout.updateMany({
        where: {
          transactionId,
          status: "PROCESSING",
        },
        data: {
          status: "FAILED",
          failureReason: err instanceof Error ? err.message : "Unknown error during callback processing",
        },
      });
    } catch (updateError) {
      console.error("[KHALTI PAYOUT CALLBACK] Failed to update payout status:", updateError);
    }

    return NextResponse.redirect(`${base}/transactions?payout=failed&error=callback_error`);
  }
}
