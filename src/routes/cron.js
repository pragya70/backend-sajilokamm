import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { sendExpiryReminderEmail } from "../lib/mail.js";

const router = Router();

function checkCronAuth(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers["authorization"] !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// GET /api/cron/expiry-reminder
router.get("/expiry-reminder", async (req, res) => {
  if (!checkCronAuth(req, res)) return;

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  let sent = 0;
  const errors = [];

  // Pass 1: 24-hour final warning
  const urgentTasks = await prisma.task.findMany({
    where: { status: "OPEN", isDeleted: false, expiryReminderSent: false, expiresAt: { gt: now, lte: in24h } },
    include: { user: { select: { email: true, name: true } } },
  });

  for (const task of urgentTasks) {
    try {
      await sendExpiryReminderEmail(task.user.email, task.user.name, task.title, task.expiresAt, 0);
      await prisma.task.update({ where: { id: task.id }, data: { expiryReminderSent: true } });
      sent++;
    } catch (err) {
      errors.push(`URGENT ${task.id}: ${err.message}`);
    }
  }

  // Pass 2: 1–3 day reminder
  const upcomingTasks = await prisma.task.findMany({
    where: { status: "OPEN", isDeleted: false, expiresAt: { gt: in24h, lte: in3Days } },
    include: { user: { select: { email: true, name: true } } },
  });

  for (const task of upcomingTasks) {
    try {
      const msLeft = task.expiresAt.getTime() - now.getTime();
      const daysLeft = Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
      await sendExpiryReminderEmail(task.user.email, task.user.name, task.title, task.expiresAt, daysLeft);
      sent++;
    } catch (err) {
      errors.push(`${task.id}: ${err.message}`);
    }
  }

  return res.json({ sent, urgent: urgentTasks.length, upcoming: upcomingTasks.length, errors: errors.length > 0 ? errors : undefined });
});

// GET /api/cron/unread-message-reminder
router.get("/unread-message-reminder", async (req, res) => {
  if (!checkCronAuth(req, res)) return;

  try {
    // Find conversations with unread messages older than 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const unreadMessages = await prisma.message.findMany({
      where: { isRead: false, createdAt: { lte: cutoff } },
      include: {
        conversation: {
          include: {
            poster: { select: { id: true, email: true, name: true } },
            tasker: { select: { id: true, email: true, name: true } },
          },
        },
        sender: { select: { name: true } },
      },
      distinct: ["conversationId"],
    });

    console.log(`[CRON] Found ${unreadMessages.length} conversations with unread messages`);
    return res.json({ processed: unreadMessages.length });
  } catch (err) {
    console.error("[CRON/UNREAD-MESSAGE-REMINDER]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
