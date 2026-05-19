import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/subcategories
 * Get all subcategories (Admin only)
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;

    const subcategories = await prisma.subCategory.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, subcategories });
  } catch (error) {
    console.error("[ADMIN-SUBCATEGORIES] Error fetching subcategories:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch subcategories" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/subcategories
 * Create new subcategory (Admin only)
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { name, description, status = true, categoryId } = await req.json();

    if (!name || !categoryId) {
      return NextResponse.json(
        { success: false, error: "Name and category ID are required" },
        { status: 400 }
      );
    }

    const subcategory = await prisma.subCategory.create({
      data: { 
        name, 
        categoryId,
        description: description || null,
        status
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ success: true, subcategory }, { status: 201 });
  } catch (error: any) {
    console.error("[ADMIN-SUBCATEGORIES] Error creating subcategory:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "Subcategory already exists in this category" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create subcategory" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/subcategories
 * Update subcategory (Admin only)
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { subcategoryId, name, description, status, categoryId } = await req.json();

    if (!subcategoryId) {
      return NextResponse.json(
        { success: false, error: "Subcategory ID is required" },
        { status: 400 }
      );
    }

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;

    const subcategory = await prisma.subCategory.update({
      where: { id: subcategoryId },
      data,
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ success: true, subcategory });
  } catch (error) {
    console.error("[ADMIN-SUBCATEGORIES] Error updating subcategory:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update subcategory" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/subcategories
 * Delete subcategory (Admin only)
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const subcategoryId = searchParams.get("subcategoryId");

    if (!subcategoryId) {
      return NextResponse.json(
        { success: false, error: "Subcategory ID is required" },
        { status: 400 }
      );
    }

    await prisma.subCategory.delete({
      where: { id: subcategoryId },
    });

    return NextResponse.json({ success: true, message: "Subcategory deleted successfully" });
  } catch (error) {
    console.error("[ADMIN-SUBCATEGORIES] Error deleting subcategory:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete subcategory" },
      { status: 500 }
    );
  }
}
