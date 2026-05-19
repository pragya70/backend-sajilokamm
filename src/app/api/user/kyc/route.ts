import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";
import { getAuthenticatedUser } from "@/lib/unifiedAuth";
import { createAdminNotification, NotificationTemplates } from "@/lib/notifications";

export async function OPTIONS() { return optionsResponse(); }

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });

  const { documentUrl, selfieUrl, fullName, documentType, documentNumber, dob, gender, nationality } = await req.json();

  if (!documentUrl || !selfieUrl || !fullName || !documentType || !documentNumber || !dob) {
    return corsJson({ error: "All KYC fields are required, including both document and selfie photo." }, { status: 400 });
  }

  try {
    // Store selfie in kycDocumentUrl (primary) and document as JSON in the same field
    // We encode both as a JSON string so no schema change is needed
    const combinedPayload = JSON.stringify({ 
      document: documentUrl, 
      selfie: selfieUrl,
      gender: gender || null,
      nationality: nationality || "Nepal"
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        kycDocumentUrl: combinedPayload,
        kycFullName: fullName,
        kycDocumentType: documentType,
        kycDocumentNumber: documentNumber,
        kycDob: new Date(dob),
        verificationStatus: "PENDING",
      },
    });

    const { sendKYCModerationAlert } = await import("@/lib/mail");
    sendKYCModerationAlert(user.name || "A user").catch(console.error);

    // Notify all admins about new KYC submission
    await createAdminNotification(
      NotificationTemplates.kycSubmitted(user.name || "A user", user.id)
    );

    return corsJson({ message: "KYC submitted successfully", status: "PENDING" });
  } catch (error: any) {
    console.error("KYC Submission Error:", error);
    return corsJson({ error: "Failed to submit KYC", details: error.message }, { status: 500 });
  }
}
