import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AVAILABLE_BADGES } from "@/lib/badges";

export { AVAILABLE_BADGES };

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: userId } = await params;
  const { badges } = await req.json(); // string[]

  if (!Array.isArray(badges)) return NextResponse.json({ error: "badges must be an array" }, { status: 400 });

  const validIds = AVAILABLE_BADGES.map((b) => b.id);
  const filtered = badges.filter((b) => validIds.includes(b));

  const user = await prisma.user.update({
    where: { id: userId },
    data: { badges: filtered },
    select: { id: true, name: true, badges: true },
  });

  return NextResponse.json(user);
}
