import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const email = "admin@tasker.com";
  const password = "Admin123!";
  const hashedPassword = await bcrypt.hash(password, 10);
  
  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: { 
        role: "ADMIN", 
        passwordHash: hashedPassword, 
        verificationStatus: "VERIFIED",
        isPhoneVerified: true
      },
      create: { 
        name: "Platform Admin", 
        email, 
        passwordHash: hashedPassword, 
        role: "ADMIN", 
        verificationStatus: "VERIFIED",
        isPhoneVerified: true
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: "Admin created successfully",
      credentials: {
        email: user.email,
        password: password
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
