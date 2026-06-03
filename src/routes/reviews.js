import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { z } from "zod";

const router = Router();

const reviewSchema = z.object({
  taskId: z.string().uuid(),
  receiverId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: User reviews after task completion
 */

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Leave a review for a completed task
 *     tags: [Reviews]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taskId, receiverId, rating]
 *             properties:
 *               taskId:
 *                 type: string
 *                 format: uuid
 *               receiverId:
 *                 type: string
 *                 format: uuid
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review created and user rating updated
 *       400:
 *         description: Validation error or task not completed
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const task = await prisma.task.findUnique({ where: { id: parsed.data.taskId } });
    if (!task || task.status !== "COMPLETED") return res.status(400).json({ error: "Can only review completed tasks" });

    const review = await prisma.review.create({ data: { ...parsed.data, giverId: req.user.id } });

    const allReviews = await prisma.review.findMany({ where: { receiverId: parsed.data.receiverId }, select: { rating: true } });
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await prisma.user.update({ where: { id: parsed.data.receiverId }, data: { rating: avg, reviewCount: allReviews.length } });

    return res.status(201).json(review);
  } catch (err) {
    console.error("[REVIEWS/POST]", err);
    return res.status(500).json({ error: "Failed to create review" });
  }
});

export default router;
