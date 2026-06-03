import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Tasker
 *   description: Tasker-specific endpoints
 */

/**
 * @swagger
 * /api/tasker/active-tasks:
 *   get:
 *     summary: Get active tasks assigned to a tasker
 *     tags: [Tasker]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Must match the authenticated user's ID
 *     responses:
 *       200:
 *         description: List of active tasks with accepted offer details
 *       403:
 *         description: Forbidden (userId mismatch)
 */
router.get("/active-tasks", requireAuth, async (req, res) => {
  try {
    const { userId } = req.query;
    if (userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    const activeTasks = await prisma.task.findMany({
      where: { offers: { some: { userId, status: "ACCEPTED" } } },
      include: {
        offers: { where: { userId, status: "ACCEPTED" } },
        user: { select: { id: true, name: true, email: true, phoneNumber: true, rating: true, reviewCount: true } },
        images_new: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(activeTasks);
  } catch (err) {
    console.error("[TASKER/ACTIVE-TASKS]", err);
    return res.status(500).json({ error: "Failed to fetch active tasks" });
  }
});

export default router;
