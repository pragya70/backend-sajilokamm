import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        verificationStatus: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log('[REFRESH-SESSION] Current session status:', (session.user as any).verificationStatus);
    console.log('[REFRESH-SESSION] Database status:', user.verificationStatus);

    // Force sign out and redirect to login to get fresh session
    return NextResponse.json({
      success: true,
      needsReauth: true,
      message: "Please log in again to refresh your session",
      dbStatus: user.verificationStatus,
      sessionStatus: (session.user as any).verificationStatus,
    });
  } catch (error) {
    console.error("[REFRESH-SESSION] Error:", error);
    return NextResponse.json({ error: "Failed to refresh session" }, { status: 500 });
  }
}
