import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "./prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "tasker-marketplace-secret-key-2024"
);

/**
 * CORS headers for mobile app requests
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400", // 24 hours
};

/**
 * Helper to create JSON response with CORS headers
 */
export function corsJson(data: any, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...CORS_HEADERS,
      ...(init?.headers || {}),
    },
  });
}

/**
 * Helper for OPTIONS preflight requests
 */
export function optionsResponse() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Get authenticated user from JWT token
 * Returns user object or null if not authenticated
 */
export async function getSessionUser(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        rating: true,
        reviewCount: true,
        verificationStatus: true,
      },
    });

    return user;
  } catch (error) {
    console.error("[MOBILE-AUTH] Token verification failed:", error);
    return null;
  }
}
