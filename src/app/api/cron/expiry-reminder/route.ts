import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/cron/expiry-reminder
 *
 * Two-pass email system:
 *   1. Tasks expiring in ≤ 24 hours → URGENT red email (final warning)
 *   2. Tasks expiring in 1–3 days   → Standard reminder email
 *
 * Uses `expiryReminderSent` flag to avoid sending duplicate 24hr emails.
 * Call this daily via cron.  Secure with CRON_SECRET env var.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  let sent = 0;
  const errors: string[] = [];

  // ── Pass 1: 24-hour final warning (only tasks not yet reminded) ──
  const urgentTasks = await prisma.task.findMany({
    where: {
      status: "OPEN",
      isDeleted: false,
      expiryReminderSent: false,
      expiresAt: {
        gt: now,
        lte: in24h,
      },
    },
    include: {
      user: { select: { email: true, name: true } },
    },
  });

  for (const task of urgentTasks) {
    try {
      const { sendExpiryReminderEmail } = await import("@/lib/mail");
      await sendExpiryReminderEmail(
        task.user.email,
        task.user.name,
        task.title,
        task.expiresAt!,
        0, // 0 days = "Expiring in hours" — triggers urgency styling
      );

      // Mark as sent so we don't spam them
      await prisma.task.update({
        where: { id: task.id },
        data: { expiryReminderSent: true },
      });

      sent++;
    } catch (err: any) {
      errors.push(`URGENT ${task.id}: ${err.message}`);
    }
  }

  // ── Pass 2: 1–3 day reminder (send every time cron fires, but skip tasks already in the 24h bucket) ──
  const upcomingTasks = await prisma.task.findMany({
    where: {
      status: "OPEN",
      isDeleted: false,
      expiresAt: {
        gt: in24h,     // more than 24h away (not in the urgent bucket)
        lte: in3Days,  // within 3 days
      },
    },
    include: {
      user: { select: { email: true, name: true } },
    },
  });

  for (const task of upcomingTasks) {
    try {
      const msLeft = task.expiresAt!.getTime() - now.getTime();
      const daysLeft = Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
      const { sendExpiryReminderEmail } = await import("@/lib/mail");
      await sendExpiryReminderEmail(
        task.user.email,
        task.user.name,
        task.title,
        task.expiresAt!,
        daysLeft,
      );
      sent++;
    } catch (err: any) {
      errors.push(`${task.id}: ${err.message}`);
    }
  }

  return NextResponse.json({
    sent,
    urgent: urgentTasks.length,
    upcoming: upcomingTasks.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
