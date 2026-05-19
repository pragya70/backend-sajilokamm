import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, corsJson, optionsResponse } from "@/lib/mobileAuth";
import { auth } from "@/lib/auth";

export async function OPTIONS() { return optionsResponse(); }

export async function GET(req: NextRequest) {
  // Try mobile JWT auth first
  let user = await getSessionUser(req);
  
  // If no JWT, try web session auth (NextAuth v5)
  if (!user) {
    const session = await auth();
    if (session?.user?.email) {
      const webUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, email: true, role: true, image: true, rating: true, reviewCount: true, verificationStatus: true },
      });
      user = webUser;
    }
  }
  
  if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });

  try {
    const conversations = await prisma.conversation.findMany({
      where: { OR: [{ posterId: user.id }, { taskerId: user.id }] },
      include: {
        task: { select: { id: true, title: true } },
        poster: { select: { id: true, name: true, image: true } },
        tasker: { select: { id: true, name: true, image: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { name: true } } },
        },
        _count: {
          select: { messages: { where: { isRead: false, senderId: { not: user.id } } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return corsJson(conversations);
  } catch (error) {
    console.error("Conversations GET error:", error);
    return corsJson({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Try mobile JWT auth first
  let user = await getSessionUser(req);
  
  // If no JWT, try web session auth (NextAuth v5)
  if (!user) {
    const session = await auth();
    if (session?.user?.email) {
      const webUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, email: true, role: true, image: true, rating: true, reviewCount: true, verificationStatus: true },
      });
      user = webUser;
    }
  }
  
  if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });

  try {
    const { recipientId, taskId } = await req.json();
    if (!recipientId) return corsJson({ error: "Recipient ID required" }, { status: 400 });

    const friendship = await prisma.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: user.id, receiverId: recipientId },
          { senderId: recipientId, receiverId: user.id },
        ],
      },
    });

    if (!friendship) return corsJson({ error: "You must be friends to chat" }, { status: 403 });

    const allBetween = await prisma.conversation.findMany({
      where: {
        OR: [
          { posterId: user.id, taskerId: recipientId },
          { posterId: recipientId, taskerId: user.id },
        ],
      },
    });

    const existing = allBetween.find((c) => c.taskId === (taskId || null));
    if (existing) return corsJson(existing);

    const conversation = await prisma.conversation.create({
      data: { taskId: taskId || undefined, posterId: user.id, taskerId: recipientId },
    });

    return corsJson(conversation, { status: 201 });
  } catch (error) {
    console.error("Conversation POST error:", error);
    return corsJson({ error: "Internal Server Error" }, { status: 500 });
  }
}
