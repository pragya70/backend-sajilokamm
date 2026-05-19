import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALIDITY_MAP: Record<string, number> = {
  "1w": 7,
  "2w": 14,
  "1m": 30,
  "2m": 60,
  "3m": 90,
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  // Allow body to override period; fall back to task's own period, then "1m"
  let body: any = {};
  try { body = await req.json(); } catch { /* no body */ }

  const period: string = body.validityPeriod || task.validityPeriod || "1m";
  const days = VALIDITY_MAP[period] ?? 30;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  const updated = await prisma.task.update({
    where: { id },
    data: {
      validityPeriod: period,
      expiresAt,
      expiryReminderSent: false, // Reset so 24hr reminder can fire again
    },
  });

  return NextResponse.json({ success: true, expiresAt: updated.expiresAt, validityPeriod: updated.validityPeriod });
}
