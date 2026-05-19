import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";
import { getAuthenticatedUser } from "@/lib/unifiedAuth";

export async function OPTIONS() { return optionsResponse(); }

export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });

  const { bio, image, coverImage, name } = await req.json();

  const data: any = {};
  if (bio !== undefined) data.bio = bio;
  if (image !== undefined) data.image = image;
  if (coverImage !== undefined) data.coverImage = coverImage;
  if (name !== undefined) data.name = name;

  try {
    const updated = await prisma.user.update({ where: { id: user.id }, data });
    return corsJson({ success: true, image: updated.image, bio: updated.bio, name: updated.name });
  } catch (err: any) {
    return corsJson({ error: err.message }, { status: 500 });
  }
}
