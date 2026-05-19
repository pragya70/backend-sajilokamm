import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (await params).id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tasks: {
          orderBy: { createdAt: "desc" },
          include: { offers: true }
        },
        offers: {
          orderBy: { createdAt: "desc" },
          include: { task: true }
        },
        reviewsGot: true,
        reviewsGiven: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch user details" }, { status: 500 });
  }
}
