import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/unifiedAuth";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() { return optionsResponse(); }

/**
 * GET: Fetch conversations for a specific task
 * - If Poster: Fetches all conversations (one per tasker who is a friend)
 * - If Tasker: Fetches their specific conversation with the poster
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const user = await getAuthenticatedUser(req);
  if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { userId: true },
    });

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const isPoster = task.userId === userId;

    console.log("Fetching conversations for taskId:", taskId, "userId:", userId, "isPoster:", isPoster);

    // Fetch existing conversations
    const existingConversations = await prisma.conversation.findMany({
      where: {
        taskId,
        OR: isPoster ? undefined : [{ taskerId: userId }, { posterId: userId }],
      },
      include: {
        tasker: { select: { id: true, name: true, image: true } },
        poster: { select: { id: true, name: true, image: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    console.log("Existing conversations found:", existingConversations.length);

    if (isPoster) {
      // 1. Get all accepted friendships for this user
      const friendships = await prisma.friendship.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ senderId: userId }, { receiverId: userId }]
        }
      });

      // 2. Extract the IDs of the friends
      const friendIds = friendships.map(f => f.senderId === userId ? f.receiverId : f.senderId);

      // 3. Find those users who don't have a conversation record yet on this task
      const allFriends = await prisma.user.findMany({
        where: {
          id: { in: friendIds },
          conversationsAsTasker: { none: { taskId } },
        },
        select: { id: true, name: true, image: true },
      });

      console.log("Friends found for poster:", allFriends.length, allFriends);

      // Construct "Virtual" conversations for these friends
      const virtualConversations = allFriends.map(friend => ({
        id: `pending-${friend.id}`, 
        taskId,
        posterId: userId,
        taskerId: friend.id,
        tasker: friend,
        poster: { id: userId, name: user.name, image: user.image },
        isVirtual: true,
      }));

      return corsJson([...existingConversations, ...virtualConversations]);
    }

    return corsJson(existingConversations);
  } catch (error) {
    return corsJson({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Create or find a conversation between poster and tasker
 * Needs: { taskerId } in body
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
    const { taskerId } = await req.json();
    if (!taskerId) return corsJson({ error: "Tasker ID required" }, { status: 400 });

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { userId: true },
    });

    if (!task) return corsJson({ error: "Task not found" }, { status: 404 });

    // Ensure users are friends
    const friendship = await prisma.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: task.userId, receiverId: taskerId },
          { senderId: taskerId, receiverId: task.userId },
        ],
      },
    });

    if (!friendship) {
      return corsJson({ error: "Users must be friends to start a private chat" }, { status: 403 });
    }

    // Auth check: Requester must be either the poster or the tasker
    if (userId !== task.userId && userId !== taskerId) {
      return corsJson({ error: "Forbidden" }, { status: 403 });
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: { taskId, taskerId },
      include: {
        tasker: { select: { id: true, name: true, image: true } },
        poster: { select: { id: true, name: true, image: true } },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          taskId,
          posterId: task.userId,
          taskerId,
        },
        include: {
          tasker: { select: { id: true, name: true, image: true } },
          poster: { select: { id: true, name: true, image: true } },
        },
      });
    }

    return corsJson(conversation);
  } catch (error) {
    console.error("Conversation creation error:", error);
    return corsJson({ error: "Internal Server Error" }, { status: 500 });
  }
}
