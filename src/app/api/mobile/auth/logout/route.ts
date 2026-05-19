import { NextRequest } from "next/server";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";

/**
 * OPTIONS /api/mobile/auth/logout
 * Handle CORS preflight
 */
export async function OPTIONS() {
  console.log("[MOBILE-LOGOUT] OPTIONS preflight request");
  return optionsResponse();
}

/**
 * POST /api/mobile/auth/logout
 * Mobile app logout endpoint
 * 
 * For JWT-based auth, logout is primarily client-side (delete token).
 * This endpoint logs the event and can be extended for:
 * - Token blacklisting
 * - Session invalidation
 * - Audit logging
 */
export async function POST(req: NextRequest) {
  try {
    console.log("[MOBILE-LOGOUT] ========================================");
    console.log("[MOBILE-LOGOUT] Logout request received");
    console.log("[MOBILE-LOGOUT] Time:", new Date().toISOString());
    
    // Get token from Authorization header
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (token) {
      console.log("[MOBILE-LOGOUT] Token received (first 20 chars):", token.substring(0, 20) + "...");
      
      // TODO: Add token blacklisting here if needed
      // await blacklistToken(token);
      
      // TODO: Log to audit table
      // await prisma.auditLog.create({
      //   data: { action: "LOGOUT", token: token.substring(0, 20) }
      // });
    } else {
      console.log("[MOBILE-LOGOUT] No token provided");
    }

    console.log("[MOBILE-LOGOUT] Logout successful");
    console.log("[MOBILE-LOGOUT] ========================================");
    
    return corsJson({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error: any) {
    console.error("[MOBILE-LOGOUT] ========================================");
    console.error("[MOBILE-LOGOUT] Error:", error.message);
    console.error("[MOBILE-LOGOUT] Stack:", error.stack);
    console.error("[MOBILE-LOGOUT] ========================================");
    
    return corsJson(
      {
        success: false,
        error: error.message || "Logout failed",
      },
      { status: 500 }
    );
  }
}
