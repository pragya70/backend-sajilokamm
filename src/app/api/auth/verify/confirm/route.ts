import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { phone, token } = await req.json();

    if (!phone || !token) {
      return NextResponse.json({ error: "Phone and token are required" }, { status: 400 });
    }

    // Find the token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        phone,
        token,
        expires: { gt: new Date() },
      },
    });

    if (!verificationToken) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    // Update user status - only mark phone as verified, NOT KYC verified
    await prisma.user.update({
      where: { phoneNumber: phone },
      data: {
        isPhoneVerified: true,
        // Keep verificationStatus as UNVERIFIED - user needs to complete KYC
        verificationStatus: "UNVERIFIED",
      },
    });

    // Delete the token
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    });

    return NextResponse.json({ message: "Phone verified successfully" });
  } catch (error) {
    console.error("Verification Error:", error);
    return NextResponse.json({ error: "Failed to verify phone" }, { status: 500 });
  }
}
