import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOTP } from "@/lib/sms";

export async function POST(req: Request) {
  try {
    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.isPhoneVerified) {
      return NextResponse.json({ error: "Phone already verified" }, { status: 400 });
    }

    // Generate new OTP
    const otp = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Upsert verification token
    await prisma.verificationToken.upsert({
      where: { phone: phoneNumber },
      update: { token: otp, expires },
      create: { phone: phoneNumber, token: otp, expires },
    });

    // Send SMS
    const { sendSMS } = await import("@/lib/sms");
    const smsRes = await sendSMS(phoneNumber, `Your new Tasker verification code is: ${otp}`);

    if (!smsRes.success) {
      return NextResponse.json({ error: "Failed to send SMS. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ message: "New OTP sent successfully" });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
