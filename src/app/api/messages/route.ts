import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, corsJson, optionsResponse } from "@/lib/mobileAuth";
import { pusherServer } from "@/lib/pusher";
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

  const { searchParams } = new URL(req.nextUrl);
  const conversationId = searchParams.get("conversationId");
  if (!conversationId) return corsJson({ error: "Conversation ID required" }, { status: 400 });

  try {
    const conversation = await prisma.conversation.findUnique({ 
      where: { id: conversationId },
      include: {
        task: {
          include: {
            offers: {
              where: {
                OR: [
                  { userId: user.id },
                  { task: { userId: user.id } }
                ]
              }
            }
          }
        }
      }
    });
    
    if (!conversation) return corsJson({ error: "Conversation not found" }, { status: 404 });

    const isAdmin = user.role === "ADMIN";
    const isParticipant = conversation.posterId === user.id || conversation.taskerId === user.id;
    if (!isAdmin && !isParticipant) return corsJson({ error: "Forbidden" }, { status: 403 });

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "asc" },
    });

    // Check messaging status
    let canMessage = true;
    let messagingBlockedReason = null;

    if (conversation.task) {
      const task = conversation.task;
      
      // Check if task is completed
      if (task.status === "COMPLETED") {
        canMessage = false;
        messagingBlockedReason = "This task has been completed. Messaging is disabled.";
      } else {
        // Check if there's an accepted offer
        const hasAcceptedOffer = task.offers.some(offer => offer.status === "ACCEPTED");
        
        if (!hasAcceptedOffer) {
          canMessage = false;
          messagingBlockedReason = "Messaging will be enabled once the offer is accepted.";
        }
      }
    }

    return corsJson({ 
      messages, 
      canMessage, 
      messagingBlockedReason,
      taskStatus: conversation.task?.status || null
    });
  } catch (error) {
    console.error("Messages GET error:", error);
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
    const { content, conversationId, imageUrl } = await req.json();
    if (!conversationId) return corsJson({ error: "Conversation ID required" }, { status: 400 });
    if (!content && !imageUrl) return corsJson({ error: "Content or image required" }, { status: 400 });

    const conversation = await prisma.conversation.findUnique({ 
      where: { id: conversationId },
      include: {
        task: {
          include: {
            offers: {
              where: {
                OR: [
                  { userId: user.id },
                  { task: { userId: user.id } }
                ]
              }
            }
          }
        }
      }
    });
    
    if (!conversation) return corsJson({ error: "Conversation not found" }, { status: 404 });
    if (conversation.posterId !== user.id && conversation.taskerId !== user.id) {
      return corsJson({ error: "Forbidden" }, { status: 403 });
    }

    // Check if messaging is allowed
    if (conversation.task) {
      const task = conversation.task;
      
      // Check if task is completed - no messaging allowed
      if (task.status === "COMPLETED") {
        return corsJson({ 
          error: "Cannot send messages. This task has been completed." 
        }, { status: 403 });
      }

      // Check if there's an accepted offer
      const hasAcceptedOffer = task.offers.some(offer => offer.status === "ACCEPTED");
      
      if (!hasAcceptedOffer) {
        return corsJson({ 
          error: "Cannot send messages. Wait for the offer to be accepted." 
        }, { status: 403 });
      }
    }

    const message = await prisma.message.create({
      data: { content: content || "", imageUrl: imageUrl || null, conversationId, senderId: user.id },
      include: { sender: { select: { id: true, name: true, image: true } } },
    });

    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

    const recipientId = conversation.posterId === user.id ? conversation.taskerId : conversation.posterId;
    pusherServer.trigger(`chat-${conversationId}`, "new-message", message).catch(console.error);
    pusherServer.trigger(`user-${recipientId}-notifications`, "new-message-alert", {
      taskId: conversation.taskId, conversationId: conversation.id, message,
    }).catch(console.error);

    return corsJson(message, { status: 201 });
  } catch (error) {
    console.error("Messages POST error:", error);
    return corsJson({ error: "Internal Server Error" }, { status: 500 });
  }
}
