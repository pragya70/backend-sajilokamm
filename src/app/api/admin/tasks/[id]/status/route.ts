import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { action, reason } = await req.json();

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (action === "reject" && !reason) {
      return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
    }

    // Check if task exists
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Update task status
    const newStatus = action === "approve" ? "OPEN" : "REJECTED";
    
    await prisma.task.update({
      where: { id },
      data: {
        status: newStatus,
        ...(action === "reject" && { cancelReason: reason })
      }
    });

    // Create notification for the user
    await prisma.notification.create({
      data: {
        userId: task.userId,
        type: action === "approve" ? "TASK_ALERT" : "TASK_CANCELLED",
        title: action === "approve" ? "Task Approved" : "Task Rejected",
        message: action === "approve"
          ? `Your task "${task.title}" has been approved and is now live!`
          : `Your task "${task.title}" was rejected. Reason: ${reason}`,
        data: {
          taskId: task.id,
          action: action,
          ...(action === "reject" && { reason })
        }
      }
    });

    // Log admin action
    console.log(`[ADMIN ACTION] Task ${id} ${action}d by admin ${session.user?.email}`);

    return NextResponse.json({
      success: true,
      message: `Task ${action}d successfully`,
      newStatus
    });

  } catch (error) {
    console.error("Error updating task status:", error);
    return NextResponse.json({ error: "Failed to update task status" }, { status: 500 });
  }
}
