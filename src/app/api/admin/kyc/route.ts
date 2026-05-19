import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

/**
 * GET /api/admin/kyc
 * Get all KYC submissions with pagination (Admin only)
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const verificationStatus = searchParams.get("verificationStatus") || "PENDING";

    const skip = (page - 1) * limit;

    const where: any = {
      kycDocumentUrl: { not: null },
      verificationStatus
    };

    const [requests, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          verificationStatus: true,
          kycDocumentUrl: true,
          kycFullName: true,
          kycDocumentType: true,
          kycDocumentNumber: true,
          kycDob: true,
          phoneNumber: true,
          isPhoneVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where })
    ]);

    return NextResponse.json({ 
      success: true, 
      requests,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error("[ADMIN-KYC] Error fetching KYC submissions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch KYC submissions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/kyc/approve
 * Approve KYC submission (Admin only)
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { userId, action, reason } = await req.json();

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: "User ID and action are required" },
        { status: 400 }
      );
    }

    const status = action === "approve" ? "VERIFIED" : "REJECTED";

    const user = await prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: status },
      select: {
        id: true,
        name: true,
        email: true,
        verificationStatus: true,
      },
    });

    // Send email notification
    const { sendKYCStatusUpdate } = await import("@/lib/mail");
    sendKYCStatusUpdate(user.email, status).catch(console.error);

    // Send in-app notification to user
    await createNotification({
      userId: user.id,
      type: status === "VERIFIED" ? "KYC_APPROVED" : "KYC_REJECTED",
      title: status === "VERIFIED" ? "KYC Approved ✓" : "KYC Rejected",
      message: status === "VERIFIED" 
        ? "Your identity verification has been approved. You now have full access to all features!"
        : reason || "Your identity verification was rejected. Please resubmit with valid documents.",
      data: { status, reason },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("[ADMIN-KYC] Error updating KYC status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update KYC status" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/kyc
 * Update KYC status (Admin only)
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { userId, status } = await req.json();

    if (!userId || !status) {
      return NextResponse.json(
        { error: "User ID and status are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: status },
      select: {
        id: true,
        name: true,
        email: true,
        verificationStatus: true,
      },
    });

    // Send in-app notification to user
    await createNotification({
      userId: user.id,
      type: status === "VERIFIED" ? "KYC_APPROVED" : "KYC_REJECTED",
      title: status === "VERIFIED" ? "KYC Approved ✓" : "KYC Rejected",
      message: status === "VERIFIED" 
        ? "Your identity verification has been approved. You now have full access to all features!"
        : "Your identity verification was rejected. Please resubmit with valid documents.",
      data: { status },
    });

    // Send email notification
    const { sendKYCStatusUpdate } = await import("@/lib/mail");
    sendKYCStatusUpdate(user.email, status).catch(console.error);

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("[ADMIN-KYC] Error updating KYC status:", error);
    return NextResponse.json(
      { error: "Failed to update KYC status" },
      { status: 500 }
    );
  }
}
