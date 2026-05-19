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

    // Only allow fetching own active tasks
    const currentUserId = (session.user as any).id;
    if (userId !== currentUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find tasks where the user has an accepted offer
    const activeTasks = await prisma.task.findMany({
      where: {
        offers: {
          some: {
            userId,
            status: "ACCEPTED",
          },
        },
      },
      include: {
        offers: {
          where: { userId, status: "ACCEPTED" },
        },
        poster: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            rating: true,
            reviewCount: true,
          },
        },
        images: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(activeTasks);
  } catch (error) {
    console.error("Error fetching active tasks:", error);
    return NextResponse.json({ error: "Failed to fetch active tasks" }, { status: 500 });
  }
}
