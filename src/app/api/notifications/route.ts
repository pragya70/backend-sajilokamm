import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, corsJson, optionsResponse } from "@/lib/mobileAuth";
import { auth } from "@/lib/auth";

export async function OPTIONS() { return optionsResponse(); }

export async function GET(req: NextRequest) {
  // Try mobile JWT auth first
  let user = await getSessionUser(req);
  
  // If no JWT, try web session auth (NextAuth v5)
  if (!user) {
    const session = await auth();
    if (session?.user?.email) {
      const webUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, email: true, role: true, image: true, rating: true, reviewCount: true, verificationStatus: true },
      });
      user = webUser;
    }
  }
  
  if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  try {
    // Define role-based notification types
    const roleBasedTypes: Record<string, any[]> = {
      ADMIN: [
        "KYC_SUBMITTED",
        "KYC_APPROVED",
        "KYC_REJECTED",
        "TASK_FLAGGED",
        "TASK_POSTED",
        "USER_REPORTED",
        "PAYMENT_ISSUE",
        "SYSTEM_ALERT",
        "DISPUTE_OPENED",
        "DISPUTE_RESOLVED",
      ],
      POSTER: [
        "OFFER_RECEIVED",
        "TASK_COMPLETED",
        "TASK_STARTED",
        "PAYMENT_RECEIVED",
        "REVIEW_RECEIVED",
        "NEW_OFFER",
        "OFFER_ACCEPTED",
        "NEW_MESSAGE",
        "NEW_COMMENT",
        "TASK_ALERT",
        "TASK_CANCELLED",
        "FRIEND_REQUEST",
        "FRIEND_ACCEPT",
      ],
      TASKER: [
        "TASK_ASSIGNED",
        "PAYMENT_RELEASED",
        "TASK_DEADLINE",
        "PROFILE_VIEWED",
        "OFFER_ACCEPTED",
        "NEW_MESSAGE",
        "REVIEW_RECEIVED",
        "TASK_ALERT",
        "FRIEND_REQUEST",
        "FRIEND_ACCEPT",
      ],
    };

    // Get allowed notification types for user's role (default to POSTER if role is missing)
    const userRole = user.role || "POSTER";
    const allowedTypes = roleBasedTypes[userRole] || roleBasedTypes.POSTER;

    const notifications = await prisma.notification.findMany({
      where: { 
        userId: user.id,
        ...(unreadOnly ? { read: false } : {}) 
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Filter notifications by role on the application side
    const filteredNotifications = notifications.filter(n => 
      allowedTypes.includes(n.type)
    );

    return corsJson(filteredNotifications);
  } catch (error: any) {
    console.error("[NOTIFICATIONS] Error:", error);
    console.error("[NOTIFICATIONS] Error details:", {
      message: error.message,
      stack: error.stack,
      userId: user?.id,
      userRole: user?.role
    });
    return corsJson({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  // Try mobile JWT auth first
  let user = await getSessionUser(req);
  
  // If no JWT, try web session auth (NextAuth v5)
  if (!user) {
    const session = await auth();
    if (session?.user?.email) {
      const webUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, email: true, role: true, image: true, rating: true, reviewCount: true, verificationStatus: true },
      });
      user = webUser;
    }
  }
  
  if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { notificationId } = body;

    if (notificationId) {
      await prisma.notification.update({ where: { id: notificationId, userId: user.id }, data: { read: true } });
    } else {
      await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
    }

    return corsJson({ success: true });
  } catch {
    return corsJson({ error: "Internal Server Error" }, { status: 500 });
  }
}
