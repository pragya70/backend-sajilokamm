import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, token, newPassword } = await req.json();

    if (!email || !token || !newPassword) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // Find the token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken || verificationToken.email !== email || verificationToken.expires < new Date()) {
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Hash the new password with 12 salt rounds
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update the password and clear any reset-specific data
    await prisma.user.update({
      where: { email },
      data: { passwordHash: hashedPassword },
    });

    // Delete the token after successful use
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    });

    return NextResponse.json({ message: "Password reset successful. You can now login." });
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    return NextResponse.json({ error: "An error occurred. Please try again later." }, { status: 500 });
  }
}
