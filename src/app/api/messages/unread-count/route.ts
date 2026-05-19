import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Count unread messages in conversations where user is either poster or tasker
    const unreadCount = await prisma.message.count({
      where: {
        OR: [
          {
            conversation: {
              posterId: userId,
            },
            senderId: { not: userId }, // Message not sent by current user
            isRead: false,
          },
          {
            conversation: {
              taskerId: userId,
            },
            senderId: { not: userId }, // Message not sent by current user
            isRead: false,
          },
        ],
      },
    });

    return NextResponse.json({ count: unreadCount });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}
