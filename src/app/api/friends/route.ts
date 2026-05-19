import { NextRequest } from "next/server";
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

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ senderId: user.id }, { receiverId: user.id }] },
    include: {
      sender: { select: { id: true, name: true, image: true } },
      receiver: { select: { id: true, name: true, image: true } },
    },
  });

  return corsJson(friendships);
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
    const { receiverId } = await req.json();
    if (!receiverId) return corsJson({ error: "Receiver ID required" }, { status: 400 });
    if (user.id === receiverId) return corsJson({ error: "Cannot add yourself" }, { status: 400 });

    const existing = await prisma.friendship.findFirst({
      where: { OR: [{ senderId: user.id, receiverId }, { senderId: receiverId, receiverId: user.id }] },
    });
    if (existing) return corsJson({ error: "Request already exists", status: existing.status }, { status: 400 });

    const friendship = await prisma.$transaction(async (tx) => {
      const f = await tx.friendship.create({ data: { senderId: user.id, receiverId, status: "PENDING" } });
      await tx.notification.create({
        data: {
          userId: receiverId,
          type: "FRIEND_REQUEST",
          title: "New Friend Request",
          message: `${user.name} sent you a friend request.`,
          data: { senderId: user.id },
        },
      });
      return f;
    });

    return corsJson(friendship, { status: 201 });
  } catch {
    return corsJson({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
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
    const { requestId, status } = await req.json();
    if (!requestId || !status) return corsJson({ error: "Missing parameters" }, { status: 400 });

    const friendship = await prisma.friendship.findUnique({ where: { id: requestId } });
    if (!friendship) return corsJson({ error: "Request not found" }, { status: 404 });
    if (friendship.receiverId !== user.id) return corsJson({ error: "Forbidden" }, { status: 403 });

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.friendship.update({ where: { id: requestId }, data: { status } });
      if (status === "ACCEPTED") {
        await tx.notification.create({
          data: {
            userId: friendship.senderId,
            type: "FRIEND_ACCEPT",
            title: "Friend Request Accepted",
            message: `${user.name} accepted your friend request.`,
            data: { receiverId: user.id },
          },
        });
      }
      return u;
    });

    return corsJson(updated);
  } catch {
    return corsJson({ error: "Internal Server Error" }, { status: 500 });
  }
}
