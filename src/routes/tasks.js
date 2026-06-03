import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { createAdminNotification, NotificationTemplates } from "../lib/notifications.js";
import { z } from "zod";

const router = Router();

const VALIDITY_OPTIONS = ["1w", "2w", "1m", "2m", "3m"];
const VALIDITY_DAYS = { "1w": 7, "2w": 14, "1m": 30, "2m": 60, "3m": 90 };

function computeExpiry(period) {
  const d = new Date();
  d.setDate(d.getDate() + VALIDITY_DAYS[period]);
  return d;
}

const createTaskSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20),
  requirements: z.string().optional(),
  budget: z.number().min(1).max(100000),
  category: z.string().optional(),
  subCategory: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  dueDate: z.string().optional(),
  images: z.array(z.string()).optional(),
  validityPeriod: z.enum(VALIDITY_OPTIONS).default("1m"),
  customExpiresAt: z.string().optional(),
});

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task management
 */

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: List tasks (open tasks or current user's tasks)
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category slug
 *       - in: query
 *         name: mine
 *         schema:
 *           type: boolean
 *         description: If true, return only the authenticated user's tasks (requires auth)
 *     responses:
 *       200:
 *         description: List of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized (when mine=true without token)
 */
router.get("/", async (req, res) => {
  try {
    const { category, mine } = req.query;
    const now = new Date();

    if (mine === "true") {
      const user = req.user;
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const tasks = await prisma.task.findMany({
        where: { userId: user.id, isDeleted: false },
        include: {
          user: { select: { id: true, name: true, image: true, rating: true } },
          _count: { select: { offers: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return res.json(tasks);
    }

    const tasks = await prisma.task.findMany({
      where: {
        status: "OPEN",
        isDeleted: false,
        ...(category ? { category } : {}),
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        user: { select: { id: true, name: true, image: true, rating: true } },
        _count: { select: { offers: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(tasks);
  } catch (err) {
    console.error("[TASKS/GET]", err);
    return res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task (Posters only, KYC required)
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, budget]
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 minLength: 20
 *               requirements:
 *                 type: string
 *               budget:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 100000
 *               category:
 *                 type: string
 *               subCategory:
 *                 type: string
 *               location:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               validityPeriod:
 *                 type: string
 *                 enum: [1w, 2w, 1m, 2m, 3m]
 *                 default: 1m
 *               customExpiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Task created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       403:
 *         description: Not a Poster or KYC not verified
 *       429:
 *         description: Daily post limit reached (max 3/day)
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const user = req.user;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, verificationStatus: true, postsTodayCount: true, lastPostDate: true },
    });

    if (!dbUser) return res.status(404).json({ error: "User not found" });
    if (dbUser.role !== "POSTER") return res.status(403).json({ error: "Only Posters can create tasks" });
    if (dbUser.verificationStatus !== "VERIFIED") return res.status(403).json({ error: "KYC Verification Required" });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const lastPostDate = dbUser.lastPostDate ? new Date(dbUser.lastPostDate) : null;
    if (lastPostDate) lastPostDate.setHours(0, 0, 0, 0);

    let newCount = 1;
    if (lastPostDate && lastPostDate.getTime() === today.getTime()) {
      if (dbUser.postsTodayCount >= 3) return res.status(429).json({ error: "Daily limit of 3 posts reached" });
      newCount = dbUser.postsTodayCount + 1;
    }

    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { validityPeriod, customExpiresAt: customExpiresAtStr, ...rest } = parsed.data;

    let expiresAt;
    if (customExpiresAtStr) {
      const custom = new Date(customExpiresAtStr);
      const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 90);
      if (isNaN(custom.getTime()) || custom <= new Date()) return res.status(400).json({ error: "Custom expiry date must be in the future" });
      if (custom > maxDate) return res.status(400).json({ error: "Custom expiry date cannot exceed 3 months" });
      expiresAt = custom;
    } else {
      expiresAt = computeExpiry(validityPeriod);
    }

    const task = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { lastPostDate: new Date(), postsTodayCount: newCount } });
      return tx.task.create({
        data: {
          ...rest,
          dueDate: rest.dueDate ? new Date(rest.dueDate) : null,
          userId: user.id,
          validityPeriod: validityPeriod,
          expiresAt,
        },
      });
    });

    const { sendModerationAlert } = await import("../lib/mail.js");
    sendModerationAlert(task.title, user.name || "A user").catch(console.error);

    await createAdminNotification(
      NotificationTemplates.taskPosted(user.name || "A user", task.title, task.id, task.budget, task.category)
    );

    if (task.category) {
      prisma.user.findMany({
        where: { role: "TASKER", verificationStatus: "VERIFIED", selectedCategories: { has: task.category }, id: { not: user.id } },
        select: { id: true, email: true, name: true },
      }).then(async (taskers) => {
        const { sendTaskAlertEmail } = await import("../lib/mail.js");
        for (const tasker of taskers) {
          prisma.notification.create({ data: { userId: tasker.id, type: "TASK_ALERT", title: "New Task in Your Category", message: `"${task.title}" — NPR ${task.budget.toLocaleString()}`, data: { taskId: task.id } } }).catch(console.error);
          sendTaskAlertEmail(tasker.email, tasker.name, task.title, task.category, task.budget, task.id).catch(console.error);
        }
      }).catch(console.error);
    }

    return res.status(201).json(task);
  } catch (err) {
    console.error("[TASKS/POST]", err);
    return res.status(500).json({ error: "Failed to create task", details: err.message });
  }
});

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get a single task by ID
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       404:
 *         description: Task not found
 */
router.get("/:id", async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true, image: true, rating: true, reviewCount: true, verificationStatus: true } },
        _count: { select: { offers: true } },
      },
    });

    if (!task || task.isDeleted) return res.status(404).json({ error: "Task not found" });
    return res.json(task);
  } catch (err) {
    console.error("[TASKS/:id/GET]", err);
    return res.status(500).json({ error: "Failed to fetch task" });
  }
});

/**
 * @swagger
 * /api/tasks/{id}/comments:
 *   get:
 *     summary: Get comments for a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of comments
 */
router.get("/:id/comments", async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { taskId: req.params.id },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "asc" },
    });
    return res.json(comments);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch comments" });
  }
});

/**
 * @swagger
 * /api/tasks/{id}/comments:
 *   post:
 *     summary: Post a comment on a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment created
 *       400:
 *         description: Content required
 */
router.post("/:id/comments", requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Content required" });

    const comment = await prisma.comment.create({
      data: { content: content.trim(), taskId: req.params.id, userId: req.user.id },
      include: { user: { select: { id: true, name: true, image: true } } },
    });
    return res.status(201).json(comment);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create comment" });
  }
});

/**
 * @swagger
 * /api/tasks/{id}/cancel:
 *   post:
 *     summary: Cancel a task (owner or admin only)
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task cancelled
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 */
router.post("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (task.userId !== req.user.id && req.user.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: { status: "CANCELLED", cancelledBy: req.user.id, cancelReason: reason || null, cancelledAt: new Date() },
    });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Failed to cancel task" });
  }
});

/**
 * @swagger
 * /api/tasks/{id}/complete:
 *   post:
 *     summary: Mark task as complete (both poster and tasker must approve)
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Completion recorded
 *       403:
 *         description: Forbidden
 */
router.post("/:id/complete", requireAuth, async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const isTasker = await prisma.offer.findFirst({ where: { taskId: req.params.id, userId: req.user.id, status: "ACCEPTED" } });
    const isPoster = task.userId === req.user.id;

    if (!isTasker && !isPoster) return res.status(403).json({ error: "Forbidden" });

    const data = {};
    if (isPoster) data.completionApprovedByPoster = true;
    if (isTasker) data.completionApprovedByTasker = true;

    const updated = await prisma.task.update({ where: { id: req.params.id }, data });

    if (updated.completionApprovedByPoster && updated.completionApprovedByTasker) {
      await prisma.task.update({ where: { id: req.params.id }, data: { status: "COMPLETED" } });
    }

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Failed to complete task" });
  }
});

/**
 * @swagger
 * /api/tasks/{id}/dispute:
 *   post:
 *     summary: Open a dispute on a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Dispute opened
 *       404:
 *         description: Task not found
 */
router.post("/:id/dispute", requireAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: { disputeOpenedBy: req.user.id, disputeReason: reason, disputeOpenedAt: new Date() },
    });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Failed to open dispute" });
  }
});

/**
 * @swagger
 * /api/tasks/{id}/submit-proof:
 *   post:
 *     summary: Submit completion proof (tasker)
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               proofImages:
 *                 type: array
 *                 items:
 *                   type: string
 *               completionNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Proof submitted
 */
router.post("/:id/submit-proof", requireAuth, async (req, res) => {
  try {
    const { proofImages, completionNotes } = req.body;
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: { completionProofImages: proofImages || [], completionApprovedByTasker: true },
    });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Failed to submit proof" });
  }
});

/**
 * @swagger
 * /api/tasks/{id}/conversations:
 *   get:
 *     summary: Get all conversations for a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of conversations
 */
router.get("/:id/conversations", requireAuth, async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { taskId: req.params.id },
      include: {
        poster: { select: { id: true, name: true, image: true } },
        tasker: { select: { id: true, name: true, image: true } },
      },
    });
    return res.json(conversations);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

export default router;
