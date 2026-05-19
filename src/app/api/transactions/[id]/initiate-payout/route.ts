import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initiateKhaltiPayment } from "@/lib/khalti";

/**
 * Initiate Khalti payment for payout
 * This opens the Khalti payment gateway for the poster to transfer funds to tasker
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id: transactionId } = await params;

    // Find the transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        task: true,
        tasker: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            khaltiPhone: true,
            khaltiAccountName: true,
          },
        },
        poster: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Verify the user is the poster
    if (transaction.posterId !== userId) {
      return NextResponse.json(
        { error: "Only the poster can initiate payout" },
        { status: 403 }
      );
    }

    // Verify transaction is pending
    if (transaction.status !== "PENDING") {
      return NextResponse.json(
        { error: "Transaction is not pending" },
        { status: 400 }
      );
    }

    // Check if tasker has Khalti phone configured
    if (!transaction.tasker.khaltiPhone) {
      return NextResponse.json(
        { 
          error: "Tasker has not configured Khalti payment details",
          message: "The tasker needs to add their Khalti phone number in their profile to receive payments via Khalti."
        },
        { status: 400 }
      );
    }

    // Check if payout already exists
    const existingPayout = await prisma.payout.findFirst({
      where: {
        transactionId,
        status: { in: ["PENDING", "PROCESSING", "COMPLETED"] },
      },
    });

    if (existingPayout) {
      return NextResponse.json(
        { error: "Payout already initiated for this transaction" },
        { status: 400 }
      );
    }

    // Initiate Khalti payment for payout
    const khaltiPayment = await initiateKhaltiPayment({
      taskId: `payout-${transactionId}`,
      taskTitle: `Payout for: ${transaction.task.title}`,
      amountNPR: transaction.taskerPayout,
      customerName: transaction.poster.name || "Poster",
      customerEmail: transaction.poster.email,
      customerPhone: transaction.tasker.phoneNumber || transaction.tasker.khaltiPhone || "9800000000",
      returnUrlPath: `/api/payments/khalti/payout-callback?transactionId=${transactionId}`,
    });

    // Create payout record with Khalti pidx
    const payout = await prisma.payout.create({
      data: {
        transactionId,
        taskerId: transaction.taskerId,
        amount: transaction.taskerPayout,
        method: "KHALTI",
        status: "PROCESSING",
        khaltiPhone: transaction.tasker.khaltiPhone,
        notes: `Khalti payment initiated. PIDX: ${khaltiPayment.pidx}`,
      },
    });

    // Store the Khalti pidx in the payout notes for tracking
    await prisma.payout.update({
      where: { id: payout.id },
      data: {
        notes: `Khalti payment initiated. PIDX: ${khaltiPayment.pidx}. Expires: ${khaltiPayment.expires_at}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Khalti payment initiated",
      paymentUrl: khaltiPayment.payment_url,
      pidx: khaltiPayment.pidx,
      expiresAt: khaltiPayment.expires_at,
      payout: {
        id: payout.id,
        amount: payout.amount,
        status: payout.status,
      },
    });
  } catch (error) {
    console.error("Error initiating Khalti payout:", error);
    return NextResponse.json(
      { 
        error: "Failed to initiate Khalti payment",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
