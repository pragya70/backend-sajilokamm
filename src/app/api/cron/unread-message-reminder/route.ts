import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/cron/unread-message-reminder
 *
 * Runs every 12 hours (configure in your cron provider).
 * Finds users with unread messages and creates a NEW_MESSAGE notification
 * so they see it in the bell + dashboard banner.
 *
 * Secure with CRON_SECRET env var.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

  // Find all conversations that have unread messages sent in the last 12h
  const unreadMessages = await prisma.message.findMany({
    where: {
      isRead: false,
      createdAt: { gte: twelveHoursAgo },
    },
    include: {
      conversation: {
        select: { posterId: true, taskerId: true, taskId: true },
      },
      sender: { select: { name: true } },
    },
  });

  // Group by recipient → count unread per user
  const recipientMap = new Map<string, { count: number; taskId: string | null; senderName: string }>();

  for (const msg of unreadMessages) {
    const conv = msg.conversation;
    // Recipient is the other participant
    const recipientId = conv.posterId === msg.senderId ? conv.taskerId : conv.posterId;

    const existing = recipientMap.get(recipientId);
    if (existing) {
      existing.count++;
    } else {
      recipientMap.set(recipientId, {
        count: 1,
        taskId: conv.taskId,
        senderName: msg.sender.name,
      });
    }
  }

  let created = 0;

  for (const [userId, info] of recipientMap.entries()) {
    // Avoid duplicate notifications — check if one was already sent in the last 12h
    const recent = await prisma.notification.findFirst({
      where: {
        userId,
        type: "NEW_MESSAGE",
        createdAt: { gte: twelveHoursAgo },
      },
    });

    if (recent) continue; // already notified this window

    await prisma.notification.create({
      data: {
        userId,
        type: "NEW_MESSAGE",
        title: "Unread Messages",
        message: `You have ${info.count} unread message${info.count > 1 ? "s" : ""} from ${info.senderName}.`,
        data: { taskId: info.taskId },
        read: false,
      },
    });
    created++;
  }

  return NextResponse.json({
    usersWithUnread: recipientMap.size,
    notificationsCreated: created,
  });
}
