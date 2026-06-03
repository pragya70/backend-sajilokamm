/**
 * Lightweight auth helpers for Express.
 * We use JWT (jose) for both web sessions and mobile tokens.
 * NextAuth is NOT used in the backend — the frontend handles the NextAuth session.
 * The backend issues its own JWT on login and verifies it on every request.
 */
import { jwtVerify, SignJWT } from "jose";
import { prisma } from "./prisma.js";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "tasker-marketplace-secret-key-2024"
);

/**
 * Sign a JWT for a user (used on login)
 */
export async function signToken(userId) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

/**
 * Verify a JWT and return the payload
 */
export async function verifyToken(token) {
  const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: ["HS256"] });
  return payload;
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(req) {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.substring(7);
}

/**
 * Get authenticated user from request (Bearer JWT)
 * Returns user object or null
 */
export async function getAuthenticatedUser(req) {
  try {
    const token = extractBearerToken(req);
    if (!token) return null;

    const payload = await verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
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
  } catch {
    return null;
  }
}

/**
 * Express middleware — attaches user to req.user if authenticated
 */
export async function authMiddleware(req, res, next) {
  req.user = await getAuthenticatedUser(req);
  next();
}

/**
 * Express middleware — requires authentication
 */
export async function requireAuth(req, res, next) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.user = user;
  next();
}

/**
 * Express middleware — requires ADMIN role
 */
export async function requireAdmin(req, res, next) {
  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "ADMIN") return res.status(403).json({ error: "Forbidden - Admin access required" });
  req.user = user;
  next();
}
