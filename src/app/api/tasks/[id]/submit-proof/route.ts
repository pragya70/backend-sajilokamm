import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/unifiedAuth";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() { return optionsResponse(); }

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });

  const userId = user.id;
  const taskId = (await params).id;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      offers: { where: { status: "ACCEPTED" } },
    },
  });

  if (!task) return corsJson({ error: "Task not found" }, { status: 404 });
  if (task.status !== "IN_PROGRESS")
    return corsJson({ error: "Task is not in progress" }, { status: 400 });

  const acceptedOffer = task.offers[0];
  if (acceptedOffer?.userId !== userId)
    return corsJson({ error: "Only the assigned tasker can submit proof" }, { status: 403 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return corsJson({ error: "Invalid request body — payload may be too large or malformed" }, { status: 400 });
  }

  const images: string[] = body.images;

  if (!Array.isArray(images) || images.length === 0)
    return corsJson({ error: "At least one proof image is required" }, { status: 400 });

  if (images.length > 5)
    return corsJson({ error: "Maximum 5 proof images allowed" }, { status: 400 });

  await prisma.task.update({
    where: { id: taskId },
    data: { completionProofImages: images },
  });

  return corsJson({ success: true });
}
