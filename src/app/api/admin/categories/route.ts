import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/categories
 * Get all categories with subcategories (Admin only)
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const categories = await prisma.category.findMany({
      include: { 
        subCategories: {
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error("[ADMIN-CATEGORIES] Error fetching categories:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/categories
 * Create new category with subcategories (Admin only)
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { 
      name, 
      slug,
      description, 
      image,
      icon,
      featuredBackground,
      status = true,
      promoted = false,
      metaTitle,
      metaDescription,
      subCategories = []
    } = await req.json();
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: "Category name is required" },
        { status: 400 }
      );
    }

    // Generate slug if not provided
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    // Create category with subcategories
    const category = await prisma.category.create({
      data: { 
        name, 
        slug: finalSlug,
        description, 
        image: featuredBackground || image,
        icon,
        status,
        promoted,
        metaTitle,
        metaDescription,
        subCategories: {
          create: subCategories
            .filter((sub: any) => sub.name?.trim())
            .map((sub: any) => ({
              name: sub.name.trim(),
              description: sub.description || null,
              status: sub.status !== undefined ? sub.status : true,
            }))
        }
      },
      include: { subCategories: true },
    });

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error: any) {
    console.error("[ADMIN-CATEGORIES] Error creating category:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "Category name or slug already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create category" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/categories
 * Update category (Admin only)
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { 
      categoryId, 
      name, 
      slug,
      description, 
      image,
      icon,
      featuredBackground,
      status,
      promoted,
      metaTitle,
      metaDescription
    } = await req.json();

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: "Category ID is required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (status !== undefined) updateData.status = status;
    if (promoted !== undefined) updateData.promoted = promoted;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
    if (image !== undefined || featuredBackground !== undefined) {
      updateData.image = featuredBackground || image;
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: updateData,
      include: { subCategories: true },
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("[ADMIN-CATEGORIES] Error updating category:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update category" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/categories
 * Delete category (Admin only)
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: "Category ID is required" },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id: categoryId },
    });

    return NextResponse.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    console.error("[ADMIN-CATEGORIES] Error deleting category:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
