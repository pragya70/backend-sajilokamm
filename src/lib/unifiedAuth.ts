import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { getSessionUser } from "./mobileAuth";
import { auth } from "./auth";

/**
 * Unified authentication helper that supports both:
 * - Mobile JWT authentication (Bearer token)
 * - Web NextAuth session authentication
 * 
 * @param req - NextRequest object
 * @returns User object or null if not authenticated
 */
export async function getAuthenticatedUser(req: NextRequest) {
  // Try mobile JWT auth first (Bearer token)
  let user = await getSessionUser(req);
  
  // If no JWT, try web session auth (NextAuth v5)
  if (!user) {
    const session = await auth();
    if (session?.user?.email) {
      const webUser = await prisma.user.findUnique({
        where: { email: session.user.email },
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
      user = webUser;
    }
  }
  
  return user;
}

/**
 * Require authenticated user or return 401
 * 
 * @param req - NextRequest object
 * @returns User object or throws error
 */
export async function requireAuth(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
