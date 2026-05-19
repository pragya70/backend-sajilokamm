import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/unifiedAuth";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function OPTIONS() { return optionsResponse(); }

/**
 * GET: Fetch all messages for a specific conversation
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const { searchParams } = new URL(req.nextUrl);
  const conversationId = searchParams.get("conversationId");

  const user = await getAuthenticatedUser(req);
  if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;
  const userRole = user.role;

  if (!conversationId) {
    return corsJson({ error: "Conversation ID required" }, { status: 400 });
  }

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { task: true },
    });

    if (!conversation) return corsJson({ error: "Conversation not found" }, { status: 404 });

    // Auth Check: Admin, Poster of the conversation, or Tasker of the conversation
    const isAdmin = userRole === "ADMIN";
    const isParticipant = conversation.posterId === userId || conversation.taskerId === userId;

    if (!isAdmin && !isParticipant) {
      return corsJson({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return corsJson(messages);
  } catch (error) {
    return corsJson({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Send a message in a conversation
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const user = await getAuthenticatedUser(req);
  if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  try {
    const { content, conversationId } = await req.json();

    if (!content || !conversationId) {
      return corsJson({ error: "Content and Conversation ID required" }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) return corsJson({ error: "Conversation not found" }, { status: 404 });

    // Ensure sender is participant
    if (conversation.posterId !== userId && conversation.taskerId !== userId) {
      return corsJson({ error: "Forbidden" }, { status: 403 });
    }

    // Ensure they are still friends (optional but good for safety)
    const friendship = await prisma.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: conversation.posterId, receiverId: conversation.taskerId },
          { senderId: conversation.taskerId, receiverId: conversation.posterId },
        ],
      },
    });

    if (!friendship) {
      return corsJson({ error: "You must be friends to continue this chat" }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        content,
        conversationId,
        senderId: userId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Create Notification for the recipient (Non-blocking)
    const recipientId = conversation.posterId === userId ? conversation.taskerId : conversation.posterId;
    try {
      await prisma.notification.create({
        data: {
          userId: recipientId,
          type: "NEW_MESSAGE",
          title: "New Message",
          message: `You have a new message from ${user.name}`,
          data: { taskId, conversationId, messageId: message.id }
        }
      });
    } catch (notifError) {
      console.error("Non-blocking notification error:", notifError);
    }

    // Trigger Pusher (Task-specific channel)
    await pusherServer.trigger(`chat-${conversationId}`, "new-message", message);

    // Trigger Pusher (Global User channel for Popup)
    await pusherServer.trigger(`user-${recipientId}-notifications`, "new-message-alert", {
      taskId,
      conversationId,
      message,
    });

    return corsJson(message, { status: 201 });
  } catch (error) {
    console.error("Message error:", error);
    return corsJson({ error: "Internal Server Error" }, { status: 500 });
  }
}
