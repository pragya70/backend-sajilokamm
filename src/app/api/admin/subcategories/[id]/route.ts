import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.subCategory.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Subcategory deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete subcategory" }, { status: 500 });
  }
}
