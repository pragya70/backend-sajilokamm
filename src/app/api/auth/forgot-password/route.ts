import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // For security, don't reveal if user exists
      return NextResponse.json({ message: "If an account exists, a reset code has been sent." });
    }

    // Generate 6-digit code
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 3600000); // 1 hour from now

    // Save to VerificationToken table
    // Delete any existing token for this email
    await prisma.verificationToken.deleteMany({
      where: { email },
    });

    // Create new token
    await prisma.verificationToken.create({
      data: { 
        email, 
        token, 
        expires 
      },
    });

    // Send the email
    const { sendPasswordResetEmail } = await import("@/lib/mail");
    await sendPasswordResetEmail(email, token);

    return NextResponse.json({ message: "If an account exists, a reset code has been sent." });
  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json({ error: "An error occurred. Please try again later." }, { status: 500 });
  }
}
