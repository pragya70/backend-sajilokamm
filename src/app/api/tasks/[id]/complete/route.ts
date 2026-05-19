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
    const { id: taskId } = await params;
    const body = await req.json();

    const {
      proofImages,
      timeHours,
      timeMinutes,
      completionDate,
      finalNotes,
      checkedRequirements,
    } = body;

    // Validate minimum 3 images
    if (!proofImages || proofImages.length < 3) {
      return NextResponse.json(
        { error: "Minimum 3 proof images required" },
        { status: 400 }
      );
    }

    // Find the task and verify the tasker has an accepted offer
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        offers: {
          where: {
            userId: userId, // The user who made the offer (tasker)
            status: "ACCEPTED",
          },
        },
        user: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.offers.length === 0) {
      return NextResponse.json(
        { error: "No accepted offer found for this task" },
        { status: 403 }
      );
    }

    const offer = task.offers[0];

    // Update task status to COMPLETED
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "COMPLETED",
        completionApprovedByPoster: false, // Awaiting poster approval
      },
    });

    // Create a transaction record (pending payment)
    const transaction = await prisma.transaction.create({
      data: {
        taskId: taskId,
        posterId: task.userId,
        taskerId: userId,
        amount: offer.price,
        platformFee: offer.price * 0.005, // 0.5% service fee
        taskerPayout: offer.price * 0.995,
        status: "PENDING", // Awaiting poster to release funds
        type: "TASK_PAYMENT",
        proofImages: proofImages,
        timeSpentHours: parseInt(timeHours) || 0,
        timeSpentMinutes: parseInt(timeMinutes) || 0,
        completionDate: completionDate ? new Date(completionDate) : new Date(),
        completionNotes: finalNotes,
        submittedAt: new Date(),
      },
    });

    // Create notification for poster
    await prisma.notification.create({
      data: {
        userId: task.userId,
        type: "TASK_COMPLETED",
        title: "Task Completed!",
        message: `${session.user.name} has completed "${task.title}". Please review and release payment.`,
        data: {
          taskId: taskId,
          transactionId: transaction.id,
        },
        read: false,
      },
    });

    // TODO: Send email notification to poster

    return NextResponse.json({
      success: true,
      message: "Work submitted successfully",
      transaction,
    });
  } catch (error) {
    console.error("[TASK-COMPLETE] Error submitting proof:", error);
    console.error("[TASK-COMPLETE] Error details:", JSON.stringify(error, null, 2));
    
    // Return more detailed error for debugging
    return NextResponse.json(
      { 
        error: "Failed to submit proof of work",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
