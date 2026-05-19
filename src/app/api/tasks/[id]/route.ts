import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            rating: true,
            reviewCount: true,
            verificationStatus: true,
          },
        },
        _count: {
          select: {
            offers: true,
          },
        },
      },
    });

    if (!task) {
      return corsJson({ error: "Task not found" }, { status: 404 });
    }

    // Don't show deleted tasks
    if (task.isDeleted) {
      return corsJson({ error: "Task not found" }, { status: 404 });
    }

    return corsJson(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    return corsJson({ error: "Failed to fetch task" }, { status: 500 });
  }
}
