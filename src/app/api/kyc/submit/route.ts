import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const { fullName, documentType, documentNumber, dob, kycDocumentUrl } = await req.json();

    // Validate required fields
    if (!fullName || !documentType || !documentNumber || !dob || !kycDocumentUrl) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    // Update user with KYC information and set status to PENDING
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        kycFullName: fullName,
        kycDocumentType: documentType,
        kycDocumentNumber: documentNumber,
        kycDob: new Date(dob),
        kycDocumentUrl,
        verificationStatus: "PENDING",
      },
      select: {
        id: true,
        name: true,
        email: true,
        verificationStatus: true,
      },
    });

    // Create notification for admin
    await prisma.notification.create({
      data: {
        userId: userId,
        type: "TASK_ALERT",
        title: "KYC Submitted",
        message: "Your KYC documents have been submitted for review. You'll be notified once verified.",
      },
    }).catch(console.error);

    // TODO: Send email notification to user
    // TODO: Notify admins about new KYC submission

    return NextResponse.json({
      success: true,
      message: "KYC submitted successfully",
      user,
    });
  } catch (error) {
    console.error("[KYC-SUBMIT] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit KYC" },
      { status: 500 }
    );
  }
}
