import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/unifiedAuth";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() { return optionsResponse(); }

/**
 * GET: Fetch all public comments for a task
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  try {
    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" }, // Newest first
    });

    return corsJson(comments);
  } catch (error) {
    return corsJson({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Add a public comment
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const user = await getAuthenticatedUser(req);

  if (!user) {
    return corsJson({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  try {
    const { content } = await req.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        taskId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Optionally notify the Task Poster about the new comment
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { userId: true, title: true },
    });

    if (task && task.userId !== userId) {
      await prisma.notification.create({
        data: {
          userId: task.userId,
          type: "NEW_COMMENT",
          title: "New Task Comment",
          message: `${user.name} commented on your task: "${task.title}"`,
          data: { taskId, commentId: comment.id },
        },
      });
    }

    return corsJson(comment, { status: 201 });
  } catch (error) {
    console.error("Comment creation error:", error);
    return corsJson({ error: "Internal Server Error" }, { status: 500 });
  }
}
