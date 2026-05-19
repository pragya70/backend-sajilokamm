import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";
import { getAuthenticatedUser } from "@/lib/unifiedAuth";

export async function OPTIONS() { return optionsResponse(); }

// Returns the current user's fresh image from DB
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return corsJson({ image: null });
  
  const dbUser = await prisma.user.findUnique({ 
    where: { id: user.id }, 
    select: { image: true } 
  });
  
  return corsJson({ image: dbUser?.image ?? null });
}
