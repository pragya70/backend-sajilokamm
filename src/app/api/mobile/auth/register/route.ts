import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "tasker-marketplace-secret-key-2024"
);

export async function OPTIONS() { return optionsResponse(); }

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) return corsJson({ error: "Name, email and password required" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return corsJson({ error: "Email already registered" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email: email.toLowerCase(), passwordHash, role: role === "TASKER" ? "TASKER" : "POSTER" },
      select: { id: true, name: true, email: true, image: true, role: true, rating: true, reviewCount: true, verificationStatus: true, badges: true, selectedCategories: true },
    });

    const token = await new SignJWT({ userId: user.id, email: user.email, role: user.role })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(JWT_SECRET);

    return corsJson({ success: true, user, token }, { status: 201 });
  } catch (error) {
    console.error("Mobile register error:", error);
    return corsJson({ error: "Registration failed" }, { status: 500 });
  }
}
