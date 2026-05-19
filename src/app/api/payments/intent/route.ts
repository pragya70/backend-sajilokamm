import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/unifiedAuth";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() { return optionsResponse(); }

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await req.json();
  const userId = user.id;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.userId !== userId) {
    return corsJson({ error: "Forbidden" }, { status: 403 });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(task.budget * 100),
    currency: "usd",
    metadata: { taskId, userId },
    capture_method: "manual",
  });

  await prisma.task.update({
    where: { id: taskId },
    data: { stripePaymentIntentId: paymentIntent.id },
  });

  return corsJson({ clientSecret: paymentIntent.client_secret });
}
