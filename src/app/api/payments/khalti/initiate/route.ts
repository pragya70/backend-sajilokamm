import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/unifiedAuth";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";
import { prisma } from "@/lib/prisma";
import { initiateKhaltiPayment } from "@/lib/khalti";

export async function OPTIONS() { return optionsResponse(); }

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });

    let taskId: string;
    try {
      const body = await req.json();
      taskId = body.taskId;
    } catch {
      return corsJson({ error: "Invalid request body" }, { status: 400 });
    }

    const userId = user.id;

    if (!process.env.KHALTI_SECRET_KEY || process.env.KHALTI_SECRET_KEY === "your_khalti_live_secret_key_here") {
      return corsJson({ error: "Khalti is not configured. Please set KHALTI_SECRET_KEY in .env" }, { status: 503 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, title: true, budget: true, userId: true, status: true, esewaRefId: true, khaltiPidx: true },
    });

    if (!task) return corsJson({ error: "Task not found" }, { status: 404 });
    if (task.userId !== userId) return corsJson({ error: "Forbidden" }, { status: 403 });
    if (task.status !== "COMPLETED") return corsJson({ error: "Task is not completed" }, { status: 400 });
    if (task.esewaRefId || task.khaltiPidx) return corsJson({ error: "Already paid" }, { status: 400 });

    const userDetails = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phoneNumber: true },
    });

    const result = await initiateKhaltiPayment({
      taskId: task.id,
      taskTitle: task.title,
      amountNPR: task.budget,
      customerName: userDetails?.name || "Customer",
      customerEmail: userDetails?.email || "",
      customerPhone: userDetails?.phoneNumber || undefined,
    });

    await prisma.task.update({
      where: { id: taskId },
      data: { khaltiPidx: result.pidx },
    });

    return corsJson({ payment_url: result.payment_url });
  } catch (err: any) {
    console.error("Khalti initiate error:", err.message);
    return corsJson({ error: err.message }, { status: 500 });
  }
}
