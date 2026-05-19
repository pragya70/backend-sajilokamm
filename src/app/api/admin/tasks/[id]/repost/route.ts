import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the original task
    const originalTask = await prisma.task.findUnique({
      where: { id }
    });

    if (!originalTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Create a new task with the same details
    const newTask = await prisma.task.create({
      data: {
        title: originalTask.title,
        description: originalTask.description,
        budget: originalTask.budget,
        location: originalTask.location,
        latitude: originalTask.latitude,
        longitude: originalTask.longitude,
        dueDate: originalTask.dueDate,
        category: originalTask.category,
        subCategory: originalTask.subCategory,
        images: originalTask.images,
        userId: originalTask.userId,
        status: "PENDING_APPROVAL",
        categoryId: originalTask.categoryId,
        subCategoryId: originalTask.subCategoryId
      }
    });

    // Notify the user
    await prisma.notification.create({
      data: {
        userId: originalTask.userId,
        type: "TASK_ALERT",
        title: "Task Reposted",
        message: `Your task "${originalTask.title}" has been reposted by admin and is pending approval.`,
        data: {
          taskId: newTask.id,
          originalTaskId: originalTask.id,
          action: "repost"
        }
      }
    });

    // Log admin action
    console.log(`[ADMIN ACTION] Task ${id} reposted as ${newTask.id} by admin ${session.user?.email}`);

    return NextResponse.json({
      success: true,
      message: "Task reposted successfully",
      newTaskId: newTask.id
    });

  } catch (error) {
    console.error("Error reposting task:", error);
    return NextResponse.json({ error: "Failed to repost task" }, { status: 500 });
  }
}
