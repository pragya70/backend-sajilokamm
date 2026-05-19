import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "tasker-marketplace-secret-key-2024"
);

/**
 * Check if the current user is an admin
 * Supports both Next.js session auth (web) and JWT tokens (mobile)
 * Returns the session if admin, or an error response if not
 */
export async function requireAdmin(req?: NextRequest) {
  // Try JWT token first (for mobile)
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET, {
          algorithms: ["HS256"],
        });
        
        // Fetch user from database to verify role
        const user = await prisma.user.findUnique({
          where: { id: payload.userId as string },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        });

        if (!user) {
          return {
            authorized: false,
            response: NextResponse.json(
              { success: false, error: "User not found" },
              { status: 401 }
            ),
          };
        }

        if (user.role !== "ADMIN") {
          return {
            authorized: false,
            response: NextResponse.json(
              { success: false, error: "Forbidden - Admin access required" },
              { status: 403 }
            ),
          };
        }

        return {
          authorized: true,
          user,
        };
      } catch (error) {
        console.error("[ADMIN-AUTH] JWT verification failed:", error);
        return {
          authorized: false,
          response: NextResponse.json(
            { success: false, error: "Invalid or expired token" },
            { status: 401 }
          ),
        };
      }
    }
  }

  // Fall back to session auth (for web)
  const session = await auth();
  
  if (!session?.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Unauthorized - Please login" },
        { status: 401 }
      ),
    };
  }

  const userRole = (session.user as any).role;
  
  if (userRole !== "ADMIN") {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Forbidden - Admin access required" },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    session,
    user: session.user,
  };
}

/**
 * Middleware wrapper for admin routes
 * Usage:
 * 
 * export async function GET(req: NextRequest) {
 *   const auth = await requireAdmin(req);
 *   if (!auth.authorized) return auth.response;
 *   
 *   // Your admin logic here
 *   return NextResponse.json({ data: "..." });
 * }
 */
