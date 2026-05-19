import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";
import { getAuthenticatedUser } from "@/lib/unifiedAuth";
import { createAdminNotification, NotificationTemplates } from "@/lib/notifications";
import { z } from "zod";

const VALIDITY_OPTIONS = ["1w", "2w", "1m", "2m", "3m"] as const;
type ValidityOption = typeof VALIDITY_OPTIONS[number];
const VALIDITY_DAYS: Record<ValidityOption, number> = { "1w": 7, "2w": 14, "1m": 30, "2m": 60, "3m": 90 };

function computeExpiry(period: ValidityOption): Date {
  const d = new Date();
  d.setDate(d.getDate() + VALIDITY_DAYS[period]);
  return d;
}

const createTaskSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20),
  requirements: z.string().optional(),
  budget: z.number().min(1, "Minimum budget is Rs. 1").max(100000, "Maximum budget is Rs. 1,00,000 (1 lakh)"),
  category: z.string().optional(),
  subCategory: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  dueDate: z.string().optional(),
  images: z.array(z.string()).optional(),
  validityPeriod: z.enum(VALIDITY_OPTIONS).default("1m"),
  customExpiresAt: z.string().optional(),
});

export async function OPTIONS() { return optionsResponse(); }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const mine = searchParams.get("mine");
  const now = new Date();

  if (mine === "true") {
    const user = await getAuthenticatedUser(req);
    if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });
    const tasks = await prisma.task.findMany({
      where: { userId: user.id, isDeleted: false },
      include: {
        user: { select: { id: true, name: true, image: true, rating: true } },
        _count: { select: { offers: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return corsJson(tasks);
  }

  const tasks = await prisma.task.findMany({
    where: {
      status: "OPEN",
      isDeleted: false,
      ...(category ? { category } : {}),
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: {
      user: { select: { id: true, name: true, image: true, rating: true } },
      _count: { select: { offers: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return corsJson(tasks);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, verificationStatus: true, postsTodayCount: true, lastPostDate: true },
    });

    if (!dbUser) return corsJson({ error: "User not found" }, { status: 404 });
    if (dbUser.role !== "POSTER") return corsJson({ error: "Only Posters can create tasks" }, { status: 403 });
    if (dbUser.verificationStatus !== "VERIFIED") return corsJson({ error: "KYC Verification Required" }, { status: 403 });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const lastPostDate = dbUser.lastPostDate ? new Date(dbUser.lastPostDate) : null;
    if (lastPostDate) lastPostDate.setHours(0, 0, 0, 0);

    let newCount = 1;
    if (lastPostDate && lastPostDate.getTime() === today.getTime()) {
      if (dbUser.postsTodayCount >= 3) return corsJson({ error: "Daily limit of 3 posts reached" }, { status: 429 });
      newCount = dbUser.postsTodayCount + 1;
    }

    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) return corsJson({ error: parsed.error.flatten() }, { status: 400 });

    const { validityPeriod, customExpiresAt: customExpiresAtStr, ...rest } = parsed.data;

    let expiresAt: Date;
    if (customExpiresAtStr) {
      const custom = new Date(customExpiresAtStr);
      const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 90);
      if (isNaN(custom.getTime()) || custom <= new Date()) return corsJson({ error: "Custom expiry date must be in the future" }, { status: 400 });
      if (custom > maxDate) return corsJson({ error: "Custom expiry date cannot exceed 3 months" }, { status: 400 });
      expiresAt = custom;
    } else {
      expiresAt = computeExpiry(validityPeriod);
    }

    const task = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { lastPostDate: new Date(), postsTodayCount: newCount } });
      return tx.task.create({
        data: { 
          ...rest, 
          dueDate: rest.dueDate ? new Date(rest.dueDate) : null, 
          userId: user.id, 
          validityPeriod: validityPeriod as string, 
          expiresAt 
        },
      });
    });

    // Send moderation alert email
    const { sendModerationAlert } = await import("@/lib/mail");
    sendModerationAlert(task.title, user.name || "A user").catch(console.error);

    // Notify all admins about new task post
    await createAdminNotification(
      NotificationTemplates.taskPosted(
        user.name || "A user",
        task.title,
        task.id,
        task.budget,
        task.category || undefined
      )
    );

    // Notify taskers in the same category
    if (task.category) {
      prisma.user.findMany({
        where: { role: "TASKER", verificationStatus: "VERIFIED", selectedCategories: { has: task.category }, id: { not: user.id } },
        select: { id: true, email: true, name: true },
      }).then(async (taskers) => {
        const { sendTaskAlertEmail } = await import("@/lib/mail");
        for (const tasker of taskers) {
          prisma.notification.create({ data: { userId: tasker.id, type: "TASK_ALERT", title: "New Task in Your Category", message: `"${task.title}" — NPR ${task.budget.toLocaleString()}`, data: { taskId: task.id } } }).catch(console.error);
          sendTaskAlertEmail(tasker.email, tasker.name, task.title, task.category!, task.budget, task.id).catch(console.error);
        }
      }).catch(console.error);
    }

    return corsJson(task, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return corsJson({ error: "Failed to create task", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
