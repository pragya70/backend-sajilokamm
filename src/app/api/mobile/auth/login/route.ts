import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "tasker-marketplace-secret-key-2024"
);

/**
 * OPTIONS /api/mobile/auth/login
 * Handle CORS preflight
 */
export async function OPTIONS() {
  console.log("[MOBILE-LOGIN] OPTIONS preflight request");
  return optionsResponse();
}

/**
 * POST /api/mobile/auth/login
 * Mobile app login endpoint
 */
export async function POST(req: NextRequest) {
  try {
    console.log("[MOBILE-LOGIN] Login request received");
    
    const { email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      console.log("[MOBILE-LOGIN] Missing email or password");
      return corsJson({ error: "Email and password required" }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        passwordHash: true,
        role: true,
        rating: true,
        reviewCount: true,
        verificationStatus: true,
        // Old format (for backward compatibility)
        badges: true,
        selectedCategories: true,
        // New normalized format
        userBadges: {
          include: {
            badge: true,
          },
        },
        userCategories: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!user || !user.passwordHash) {
      console.log("[MOBILE-LOGIN] User not found or no password");
      return corsJson({ error: "Invalid credentials" }, { status: 401 });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      console.log("[MOBILE-LOGIN] Invalid password");
      return corsJson({ error: "Invalid credentials" }, { status: 401 });
    }

    // Generate JWT token
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(JWT_SECRET);

    // Remove password from response
    const { passwordHash, ...userWithoutPassword } = user;

    console.log("[MOBILE-LOGIN] Login successful for:", user.email);
    return corsJson({
      success: true,
      user: userWithoutPassword,
      token,
    });
  } catch (error: any) {
    console.error("[MOBILE-LOGIN] Error:", error.message);
    return corsJson({ error: "Login failed" }, { status: 500 });
  }
}
