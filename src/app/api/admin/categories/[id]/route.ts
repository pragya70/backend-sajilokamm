import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      name,
      slug,
      description,
      icon,
      featuredBackground,
      status,
      promoted,
      metaTitle,
      metaDescription,
      subCategories = [],
    } = await req.json();

    // Validate that the category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: { subCategories: true },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Build category update data
    const updateData: Record<string, any> = {};

    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (featuredBackground !== undefined)
      updateData.featuredBackground = featuredBackground;
    if (status !== undefined) updateData.status = status;
    if (promoted !== undefined) updateData.promoted = promoted;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined)
      updateData.metaDescription = metaDescription;

    // Use a transaction for data integrity
    const category = await prisma.$transaction(async (tx) => {
      // Update the category
      const updatedCategory = await tx.category.update({
        where: { id },
        data: updateData,
      });

      // Sync subcategories
      const existingSubIds = existingCategory.subCategories.map(
        (sub) => sub.id
      );
      const incomingSubIds = subCategories
        .filter((sub: any) => sub.id)
        .map((sub: any) => sub.id);

      // Determine subcategories to delete (exist in DB but not in incoming payload)
      const subCategoriesToDelete = existingSubIds.filter(
        (existingId) => !incomingSubIds.includes(existingId)
      );

      // Delete removed subcategories
      if (subCategoriesToDelete.length > 0) {
        await tx.subCategory.deleteMany({
          where: { id: { in: subCategoriesToDelete } },
        });
      }

      // Update existing and create new subcategories
      for (const sub of subCategories) {
        if (!sub.name?.trim()) continue;

        const subData = {
          name: sub.name.trim(),
          description: sub.description || null,
          status: sub.status !== undefined ? sub.status : true,
        };

        if (sub.id) {
          // Update existing subcategory
          await tx.subCategory.update({
            where: { id: sub.id },
            data: subData,
          });
        } else {
          // Create new subcategory
          await tx.subCategory.create({
            data: {
              ...subData,
              categoryId: id,
            },
          });
        }
      }

      // Fetch the fully updated category with subcategories
      const result = await tx.category.findUnique({
        where: { id },
        include: {
          subCategories: {
            orderBy: { name: "asc" },
          },
        },
      });

      return result;
    });

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    console.error("[ADMIN-CATEGORIES] Error updating category:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "Category name or slug already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update category" },
      { status: 500 }
    );
  }
}

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
    await prisma.$transaction(async (tx) => {
      await tx.subCategory.deleteMany({
        where: { categoryId: id },
      });
      await tx.category.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("[ADMIN-CATEGORIES] Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        subCategories: {
          orderBy: { name: "asc" },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("[ADMIN-CATEGORIES] Error fetching category:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 }
    );
  }
}