import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Process a payout (mark as completed or failed)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id: payoutId } = await params;
    const body = await req.json();
    const { status, khaltiTxnId, esewaRefId, notes, failureReason } = body;

    // Validate status
    if (!["PROCESSING", "COMPLETED", "FAILED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be PROCESSING, COMPLETED, or FAILED" },
        { status: 400 }
      );
    }

    // Find the payout
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        transaction: {
          include: {
            task: true,
            tasker: true,
          },
        },
      },
    });

    if (!payout) {
      return NextResponse.json({ error: "Payout not found" }, { status: 404 });
    }

    // Update payout status
    const updatedPayout = await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status,
        khaltiTxnId: khaltiTxnId || payout.khaltiTxnId,
        esewaRefId: esewaRefId || payout.esewaRefId,
        notes: notes || payout.notes,
        failureReason: status === "FAILED" ? failureReason : null,
        processedAt: status === "PROCESSING" ? new Date() : payout.processedAt,
        completedAt: status === "COMPLETED" ? new Date() : null,
        processedBy: user.id,
      },
    });

    // Create notification for tasker
    if (status === "COMPLETED") {
      await prisma.notification.create({
        data: {
          userId: payout.taskerId,
          type: "PAYMENT_RELEASED",
          title: "Payment Transferred!",
          message: `Your payment of NPR ${payout.amount} for "${payout.transaction.task.title}" has been successfully transferred to your account.`,
          data: {
            taskId: payout.transaction.taskId,
            transactionId: payout.transactionId,
            payoutId: payout.id,
            amount: payout.amount,
            method: payout.method,
          },
          read: false,
        },
      });
    } else if (status === "FAILED") {
      await prisma.notification.create({
        data: {
          userId: payout.taskerId,
          type: "PAYMENT_ISSUE",
          title: "Payment Transfer Failed",
          message: `There was an issue transferring your payment of NPR ${payout.amount} for "${payout.transaction.task.title}". ${failureReason || "Please contact support."}`,
          data: {
            taskId: payout.transaction.taskId,
            transactionId: payout.transactionId,
            payoutId: payout.id,
            amount: payout.amount,
          },
          read: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Payout ${status.toLowerCase()} successfully`,
      payout: updatedPayout,
    });
  } catch (error) {
    console.error("Error processing payout:", error);
    return NextResponse.json(
      { error: "Failed to process payout" },
      { status: 500 }
    );
  }
}
