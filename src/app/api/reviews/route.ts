import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";
import { getAuthenticatedUser } from "@/lib/unifiedAuth";
import { z } from "zod";

const reviewSchema = z.object({
  taskId: z.string().uuid(),
  receiverId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export async function OPTIONS() { return optionsResponse(); }

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return corsJson({ error: parsed.error.flatten() }, { status: 400 });

  const task = await prisma.task.findUnique({ where: { id: parsed.data.taskId } });
  if (!task || task.status !== "COMPLETED") {
    return corsJson({ error: "Can only review completed tasks" }, { status: 400 });
  }

  const review = await prisma.review.create({
    data: { ...parsed.data, giverId: user.id },
  });

  // Recalculate average rating
  const allReviews = await prisma.review.findMany({
    where: { receiverId: parsed.data.receiverId },
    select: { rating: true },
  });
  const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

  await prisma.user.update({
    where: { id: parsed.data.receiverId },
    data: { rating: avg, reviewCount: allReviews.length },
  });

  return corsJson(review, { status: 201 });
}
