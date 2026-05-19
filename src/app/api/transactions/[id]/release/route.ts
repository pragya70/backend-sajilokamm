import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
            khaltiPhone: true,
            khaltiAccountName: true,
            bankName: true,
            bankAccountNumber: true,
            bankAccountName: true,
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
        { error: "Only the poster can release funds" },
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

    // Check if tasker has payment details configured
    if (!transaction.tasker.khaltiPhone && !transaction.tasker.bankAccountNumber) {
      return NextResponse.json(
        { 
          error: "Tasker has not configured payment details",
          message: "The tasker needs to add their Khalti phone number or bank account details in their profile to receive payments."
        },
        { status: 400 }
      );
    }

    // Determine payment method based on available tasker details
    const paymentMethod = transaction.tasker.khaltiPhone ? "KHALTI" : "CASH";
    let payoutStatus: "PENDING" | "PROCESSING" | "COMPLETED" = "PENDING";
    let khaltiTxnId: string | undefined;
    let failureReason: string | undefined;

    // If Khalti phone is available, attempt automatic payout
    if (transaction.tasker.khaltiPhone && paymentMethod === "KHALTI") {
      try {
        // Note: Khalti doesn't have a public payout API in their standard integration
        // This would need to be implemented using Khalti's merchant transfer API
        // For now, we'll mark it as PENDING for manual processing
        
        // TODO: Implement Khalti transfer API when available
        // const khaltiTransfer = await initiateKhaltiTransfer({
        //   phone: transaction.tasker.khaltiPhone,
        //   amount: transaction.taskerPayout,
        //   remarks: `Payment for task: ${transaction.task.title}`,
        // });
        // khaltiTxnId = khaltiTransfer.transaction_id;
        // payoutStatus = "COMPLETED";

        console.log(`[PAYOUT] Khalti payout initiated for ${transaction.tasker.khaltiPhone}, amount: NPR ${transaction.taskerPayout}`);
        payoutStatus = "PENDING"; // Will be processed manually or via admin panel
      } catch (error) {
        console.error("Khalti payout error:", error);
        failureReason = error instanceof Error ? error.message : "Khalti payout failed";
        payoutStatus = "PENDING"; // Fallback to manual processing
      }
    }

    // Create payout record and update transaction in a single transaction
    const [updatedTransaction, payout] = await prisma.$transaction([
      prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: "RELEASED",
          releasedAt: new Date(),
        },
      }),
      prisma.payout.create({
        data: {
          transactionId,
          taskerId: transaction.taskerId,
          amount: transaction.taskerPayout,
          method: paymentMethod,
          status: payoutStatus,
          khaltiPhone: transaction.tasker.khaltiPhone,
          khaltiTxnId,
          failureReason,
          notes: `Payout for task: ${transaction.task.title}`,
        },
      }),
    ]);

    // Update task to mark completion as approved by poster
    await prisma.task.update({
      where: { id: transaction.taskId },
      data: {
        completionApprovedByPoster: true,
      },
    });

    // Create notification for tasker
    await prisma.notification.create({
      data: {
        userId: transaction.taskerId,
        type: "PAYMENT_RELEASED",
        title: "Payment Released!",
        message: `${session.user.name} has released payment of NPR ${transaction.taskerPayout} for "${transaction.task.title}". ${
          payoutStatus === "COMPLETED" 
            ? "The amount has been transferred to your Khalti account." 
            : "The payout is being processed and will be transferred to your account shortly."
        }`,
        data: {
          taskId: transaction.taskId,
          transactionId,
          payoutId: payout.id,
          amount: transaction.taskerPayout,
        },
        read: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: payoutStatus === "COMPLETED" 
        ? "Payment released and transferred successfully" 
        : "Payment released successfully. Payout is being processed.",
      transaction: updatedTransaction,
      payout: {
        id: payout.id,
        status: payout.status,
        method: payout.method,
        amount: payout.amount,
      },
    });
  } catch (error) {
    console.error("Error releasing funds:", error);
    return NextResponse.json(
      { 
        error: "Failed to release funds",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
