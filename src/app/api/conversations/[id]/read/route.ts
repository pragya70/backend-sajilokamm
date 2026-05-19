import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, corsJson, optionsResponse } from "@/lib/mobileAuth";
import { pusherServer } from "@/lib/pusher";

export async function OPTIONS() { return optionsResponse(); }

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const conversation = await prisma.conversation.findUnique({ where: { id } });
    if (!conversation) return corsJson({ error: "Not Found" }, { status: 404 });
    if (conversation.posterId !== user.id && conversation.taskerId !== user.id) {
      return corsJson({ error: "Forbidden" }, { status: 403 });
    }

    const result = await prisma.message.updateMany({
      where: { conversationId: id, senderId: { not: user.id }, isRead: false },
      data: { isRead: true },
    });

    if (result.count > 0) {
      pusherServer.trigger(`chat-${id}`, "messages-read", { readBy: user.id, conversationId: id }).catch(console.error);
    }

    return corsJson({ success: true, count: result.count });
  } catch (error) {
    console.error("Mark as read error:", error);
    return corsJson({ error: "Internal Server Error" }, { status: 500 });
  }
}
