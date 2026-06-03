import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { sendOfferNotificationEmail, sendOfferRejectedEmail } from "../lib/mail.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Offers
 *   description: Task offers from taskers
 */

/**
 * @swagger
 * /api/offers:
 *   get:
 *     summary: Get all offers made by a user
 *     tags: [Offers]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Must match authenticated user's ID
 *     responses:
 *       200:
 *         description: List of offers with task details
 *       403:
 *         description: Forbidden (userId mismatch)
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const { userId } = req.query;
    if (userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    const offers = await prisma.offer.findMany({
      where: { userId },
      include: {
        task: {
          include: {
            user: { select: { name: true, email: true, phoneNumber: true, rating: true, reviewCount: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(offers);
  } catch (err) {
    console.error("[OFFERS/GET]", err);
    return res.status(500).json({ error: "Failed to fetch offers" });
  }
});

/**
 * @swagger
 * /api/offers:
 *   post:
 *     summary: Submit an offer on a task (Taskers only)
 *     tags: [Offers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taskId, price, message]
 *             properties:
 *               taskId:
 *                 type: string
 *               price:
 *                 type: number
 *                 minimum: 1
 *               message:
 *                 type: string
 *                 minLength: 10
 *     responses:
 *       201:
 *         description: Offer created
 *       400:
 *         description: Validation error or duplicate offer
 *       403:
 *         description: Only taskers can make offers
 *       404:
 *         description: Task not found
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "TASKER") return res.status(403).json({ error: "Only taskers can make offers" });

    const { taskId, price, message } = req.body;
    if (!taskId || !price || !message) return res.status(400).json({ error: "Missing required fields" });
    if (typeof price !== "number" || price <= 0) return res.status(400).json({ error: "Invalid price" });
    if (typeof message !== "string" || message.trim().length < 10) return res.status(400).json({ error: "Message must be at least 10 characters" });

    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true, status: true, userId: true } });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (task.status !== "OPEN") return res.status(400).json({ error: "Task is not accepting offers" });

    const existingOffer = await prisma.offer.findUnique({ where: { taskId_userId: { taskId, userId: user.id } } });
    if (existingOffer) return res.status(400).json({ error: "You have already made an offer for this task" });

    const offer = await prisma.offer.create({
      data: { taskId, userId: user.id, price, message: message.trim(), status: "PENDING" },
      include: {
        task: { select: { title: true, user: { select: { id: true, name: true, email: true } } } },
        user: { select: { name: true, email: true } },
      },
    });

    await prisma.notification.create({
      data: {
        userId: task.userId,
        type: "OFFER_RECEIVED",
        title: "New Offer Received",
        message: `${offer.user.name || "A tasker"} made an offer of Rs. ${price.toLocaleString()} for "${offer.task.title}"`,
        data: { offerId: offer.id, taskId: task.id, price },
      },
    });

    sendOfferNotificationEmail(offer.task.user.email, offer.task.user.name || "User", offer.task.title, offer.user.name || "A tasker", price, message, task.id).catch(console.error);

    return res.status(201).json(offer);
  } catch (err) {
    console.error("[OFFERS/POST]", err);
    return res.status(500).json({ error: "Failed to create offer" });
  }
});

/**
 * @swagger
 * /api/offers/{id}/accept:
 *   post:
 *     summary: Accept an offer (task poster only)
 *     tags: [Offers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Offer accepted, other offers rejected
 *       403:
 *         description: Only the task poster can accept offers
 *       404:
 *         description: Offer not found
 */
router.post("/:id/accept", requireAuth, async (req, res) => {
  try {
    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: { task: true, user: { select: { id: true, name: true, email: true } } },
    });

    if (!offer) return res.status(404).json({ error: "Offer not found" });
    if (offer.task.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
    if (offer.task.status !== "OPEN") return res.status(400).json({ error: "Task is not open" });

    await prisma.$transaction([
      prisma.offer.update({ where: { id: req.params.id }, data: { status: "ACCEPTED" } }),
      prisma.offer.updateMany({ where: { taskId: offer.taskId, id: { not: req.params.id } }, data: { status: "REJECTED" } }),
      prisma.task.update({ where: { id: offer.taskId }, data: { status: "IN_PROGRESS" } }),
    ]);

    // Notify accepted tasker
    await prisma.notification.create({
      data: {
        userId: offer.userId,
        type: "OFFER_ACCEPTED",
        title: "Your Offer Was Accepted!",
        message: `Your offer for "${offer.task.title}" has been accepted.`,
        data: { taskId: offer.taskId },
      },
    });

    // Notify rejected taskers
    const rejectedOffers = await prisma.offer.findMany({ where: { taskId: offer.taskId, status: "REJECTED" }, select: { userId: true, user: { select: { email: true, name: true } } } });
    for (const rejected of rejectedOffers) {
      sendOfferRejectedEmail(rejected.user.email, rejected.user.name, offer.task.title).catch(console.error);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("[OFFERS/:id/ACCEPT]", err);
    return res.status(500).json({ error: "Failed to accept offer" });
  }
});

export default router;
