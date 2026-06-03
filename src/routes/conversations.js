import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Conversations
 *   description: Chat conversations between users
 */

/**
 * @swagger
 * /api/conversations:
 *   get:
 *     summary: Get all conversations for the current user
 *     tags: [Conversations]
 *     responses:
 *       200:
 *         description: List of conversations with last message and unread count
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { OR: [{ posterId: req.user.id }, { taskerId: req.user.id }] },
      include: {
        task: { select: { id: true, title: true } },
        poster: { select: { id: true, name: true, image: true } },
        tasker: { select: { id: true, name: true, image: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { name: true } } },
        },
        _count: {
          select: { messages: { where: { isRead: false, senderId: { not: req.user.id } } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return res.json(conversations);
  } catch (err) {
    console.error("[CONVERSATIONS/GET]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/conversations:
 *   post:
 *     summary: Start or find a conversation with another user (must be friends)
 *     tags: [Conversations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipientId]
 *             properties:
 *               recipientId:
 *                 type: string
 *               taskId:
 *                 type: string
 *                 description: Optional — link conversation to a task
 *     responses:
 *       200:
 *         description: Existing conversation returned
 *       201:
 *         description: New conversation created
 *       403:
 *         description: Users are not friends
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { recipientId, taskId } = req.body;
    if (!recipientId) return res.status(400).json({ error: "Recipient ID required" });

    const friendship = await prisma.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: req.user.id, receiverId: recipientId },
          { senderId: recipientId, receiverId: req.user.id },
        ],
      },
    });

    if (!friendship) return res.status(403).json({ error: "You must be friends to chat" });

    const allBetween = await prisma.conversation.findMany({
      where: {
        OR: [
          { posterId: req.user.id, taskerId: recipientId },
          { posterId: recipientId, taskerId: req.user.id },
        ],
      },
    });

    const existing = allBetween.find((c) => c.taskId === (taskId || null));
    if (existing) return res.json(existing);

    const conversation = await prisma.conversation.create({
      data: { taskId: taskId || undefined, posterId: req.user.id, taskerId: recipientId },
    });

    return res.status(201).json(conversation);
  } catch (err) {
    console.error("[CONVERSATIONS/POST]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/conversations/{id}/read:
 *   post:
 *     summary: Mark all messages in a conversation as read
 *     tags: [Conversations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages marked as read
 */
router.post("/:id/read", requireAuth, async (req, res) => {
  try {
    await prisma.message.updateMany({
      where: { conversationId: req.params.id, senderId: { not: req.user.id }, isRead: false },
      data: { isRead: true },
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
