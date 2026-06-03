import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Task categories and sub-categories
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories with their sub-categories
 *     tags: [Categories]
 *     security: []
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   slug:
 *                     type: string
 *                   icon:
 *                     type: string
 *                     nullable: true
 *                   subCategories:
 *                     type: array
 *                     items:
 *                       type: object
 */
router.get("/", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({ include: { subCategories: true } });
    return res.json(categories);
  } catch {
    return res.status(500).json({ error: "Failed to fetch categories" });
  }
});

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category (admin only)
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               slug:
 *                 type: string
 *                 description: Auto-generated from name if omitted
 *               description:
 *                 type: string
 *               icon:
 *                 type: string
 *               featuredBackground:
 *                 type: string
 *               status:
 *                 type: boolean
 *                 default: true
 *               promoted:
 *                 type: boolean
 *                 default: false
 *               metaTitle:
 *                 type: string
 *               metaDescription:
 *                 type: string
 *               subCategories:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     status:
 *                       type: boolean
 *     responses:
 *       201:
 *         description: Category created with sub-categories
 *       400:
 *         description: Validation error or slug conflict
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      name, slug, description, icon, featuredBackground,
      status = true, promoted = false, metaTitle, metaDescription, subCategories = [],
    } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: "Category name is required" });
    if (name.trim().length < 2) return res.status(400).json({ error: "At least 2 characters required" });
    if (name.trim().length > 50) return res.status(400).json({ error: "Maximum 50 characters allowed" });

    const finalSlug = slug?.trim() ||
      name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const category = await prisma.category.create({
      data: {
        name: name.trim(), slug: finalSlug, description: description || null,
        image: featuredBackground || null, icon: icon || null, status, promoted,
        metaTitle: metaTitle || null, metaDescription: metaDescription || null,
        subCategories: {
          create: subCategories
            .filter((s) => s.name?.trim())
            .map((s) => ({ name: s.name.trim(), description: s.description || null, status: s.status !== undefined ? s.status : true })),
        },
      },
      include: { subCategories: true },
    });

    return res.status(201).json(category);
  } catch (err) {
    if (err.code === "P2002") return res.status(400).json({ error: "Category already exists" });
    return res.status(500).json({ error: "Failed to create category" });
  }
});

export default router;
