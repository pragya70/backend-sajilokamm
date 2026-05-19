import { NextRequest } from "next/server";
import { getSessionUser, corsJson, optionsResponse } from "@/lib/mobileAuth";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() { return optionsResponse(); }

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, image: true, role: true, rating: true, reviewCount: true, verificationStatus: true, badges: true, selectedCategories: true, bio: true, phoneNumber: true, isPhoneVerified: true },
  });

  if (!fullUser) return corsJson({ error: "User not found" }, { status: 404 });
  return corsJson(fullUser);
}
