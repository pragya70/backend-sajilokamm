import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/kyc/request-reupload
 * Request user to re-upload KYC documents (Admin only)
 * Clears existing documents and sets status to UNVERIFIED
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Clear KYC documents and reset status to UNVERIFIED
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        verificationStatus: "UNVERIFIED",
        kycDocumentUrl: null,
        kycFullName: null,
        kycDocumentType: null,
        kycDocumentNumber: null,
        kycDob: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        verificationStatus: true,
      },
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "TASK_ALERT",
        title: "KYC Re-upload Required",
        message: "Your KYC documents need to be re-uploaded. Please submit valid documents for verification.",
      }
    }).catch(console.error);

    // Send email notification
    const { sendKYCReuploadRequest } = await import("@/lib/mail");
    sendKYCReuploadRequest(user.email, user.name || "User").catch(console.error);

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("[ADMIN-KYC] Error requesting re-upload:", error);
    return NextResponse.json(
      { error: "Failed to request re-upload" },
      { status: 500 }
    );
  }
}
