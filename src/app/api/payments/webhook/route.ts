import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Webhook signature failed" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as any;
    const task = await prisma.task.findFirst({
      where: { stripePaymentIntentId: pi.id },
      select: { id: true },
    });
    if (task) {
      await prisma.task.update({
        where: { id: task.id },
        data: { status: "COMPLETED" },
      });
    }
  }

  return NextResponse.json({ received: true });
}
