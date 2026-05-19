import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    // Only allow fetching own offers
    const currentUserId = (session.user as any).id;
    if (userId !== currentUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const offers = await prisma.offer.findMany({
      where: { userId },
      include: {
        task: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phoneNumber: true,
                rating: true,
                reviewCount: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(offers);
  } catch (error) {
    console.error("Error fetching offers:", error);
    return NextResponse.json({ error: "Failed to fetch offers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    // Only taskers can make offers
    if (userRole !== "TASKER") {
      return NextResponse.json({ error: "Only taskers can make offers" }, { status: 403 });
    }

    const body = await req.json();
    const { taskId, price, message } = body;

    // Validation
    if (!taskId || !price || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (typeof price !== "number" || price <= 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    if (typeof message !== "string" || message.trim().length < 10) {
      return NextResponse.json({ error: "Message must be at least 10 characters" }, { status: 400 });
    }

    // Check if task exists and is open
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, status: true, userId: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.status !== "OPEN") {
      return NextResponse.json({ error: "Task is not accepting offers" }, { status: 400 });
    }

    // Check if user already made an offer
    const existingOffer = await prisma.offer.findUnique({
      where: {
        taskId_userId: {
          taskId,
          userId,
        },
      },
    });

    if (existingOffer) {
      return NextResponse.json({ error: "You have already made an offer for this task" }, { status: 400 });
    }

    // Create the offer
    const offer = await prisma.offer.create({
      data: {
        taskId,
        userId,
        price,
        message: message.trim(),
        status: "PENDING",
      },
      include: {
        task: {
          select: {
            title: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Create notification for poster
    await prisma.notification.create({
      data: {
        userId: task.userId,
        type: "OFFER_RECEIVED",
        title: "New Offer Received",
        message: `${offer.user.name || "A tasker"} made an offer of Rs. ${price.toLocaleString()} for "${offer.task.title}"`,
        data: {
          offerId: offer.id,
          taskId: task.id,
          price,
        },
      },
    });

    // Send email notification to poster
    try {
      const { sendOfferNotificationEmail } = await import("@/lib/mail");
      await sendOfferNotificationEmail(
        offer.task.user.email,
        offer.task.user.name || "User",
        offer.task.title,
        offer.user.name || "A tasker",
        price,
        message,
        task.id
      );
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json(offer, { status: 201 });
  } catch (error) {
    console.error("Error creating offer:", error);
    return NextResponse.json({ error: "Failed to create offer" }, { status: 500 });
  }
}
