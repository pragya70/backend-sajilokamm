import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phoneNumber: z.string().regex(/^[0-9]{10}$/, "Invalid Nepal phone number"),
  role: z.enum(["POSTER", "TASKER"]).default("POSTER"),
  selectedCategories: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, role, phoneNumber, selectedCategories } = registerSchema.parse(body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phoneNumber }
        ]
      },
    });

    if (existingUser) {
      if (existingUser.verificationStatus === "PENDING") {
        // Allow re-registration if the old one was never verified
        await prisma.user.delete({ where: { id: existingUser.id } });
      } else {
        return NextResponse.json(
          { error: "Email or Phone number already in use" },
          { status: 400 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Auto-promote specific email to ADMIN
    const finalRole = email === "admin@tasker.com" ? "ADMIN" : role;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phoneNumber,
        passwordHash,
        role: finalRole as any,
        selectedCategories: selectedCategories || [],
        verificationStatus: "UNVERIFIED", // Start as UNVERIFIED, becomes PENDING after KYC submission
      },
    });

    // Generate and Send OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await prisma.verificationToken.create({
      data: {
        phone: phoneNumber,
        token: otp,
        expires,
      },
    });

    // Import and send SMS (utility created earlier)
    const { sendSMS } = await import("@/lib/sms");
    await sendSMS(phoneNumber, `Your Tasker verification code is: ${otp}`);

    return NextResponse.json(
      { 
        message: "User registered successfully. Please verify your phone number.", 
        userId: user.id,
        requiresVerification: true 
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
