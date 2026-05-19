import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";
import { auth } from "@/lib/auth";

export async function OPTIONS() { return optionsResponse(); }

export async function GET() {
  try {
    const categories = await prisma.category.findMany({ include: { subCategories: true } });
    return corsJson(categories);
  } catch {
    return corsJson({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return corsJson({ error: "Unauthorized" }, { status: 401 });

    const {
      name,
      slug,
      description,
      icon,
      featuredBackground,
      status = true,
      promoted = false,
      metaTitle,
      metaDescription,
      subCategories = [],
    } = await req.json();

    if (!name?.trim()) return corsJson({ error: "Category name is required" }, { status: 400 });
    if (name.trim().length < 2) return corsJson({ error: "At least 2 characters required" }, { status: 400 });
    if (name.trim().length > 50) return corsJson({ error: "Maximum 50 characters allowed" }, { status: 400 });

    const finalSlug = slug?.trim() ||
      name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        description: description || null,
        image: featuredBackground || null,
        icon: icon || null,
        status,
        promoted,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        subCategories: {
          create: subCategories
            .filter((s: any) => s.name?.trim())
            .map((s: any) => ({
              name: s.name.trim(),
              description: s.description || null,
              status: s.status !== undefined ? s.status : true,
            })),
        },
      },
      include: { subCategories: true },
    });

    return corsJson(category, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") return corsJson({ error: "Category already exists" }, { status: 400 });
    return corsJson({ error: "Failed to create category" }, { status: 500 });
  }
}
