import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import PusherServer from "pusher";

const router = Router();

const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.PUSHER_CLUSTER || "ap4",
  useTLS: true,
});

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Chat messages within conversations
 */

/**
 * @swagger
 * /api/messages:
 *   get:
 *     summary: Get messages for a conversation
 *     tags: [Messages]
 *     parameters:
 *       - in: query
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages and messaging status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                 canMessage:
 *                   type: boolean
 *                 messagingBlockedReason:
 *                   type: string
 *                   nullable: true
 *                 taskStatus:
 *                   type: string
 *                   nullable: true
 *       403:
 *         description: Not a conversation participant
 *       404:
 *         description: Conversation not found
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.query;
    if (!conversationId) return res.status(400).json({ error: "Conversation ID required" });

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        task: {
          include: {
            offers: { where: { OR: [{ userId: req.user.id }, { task: { userId: req.user.id } }] } },
          },
        },
      },
    });

    if (!conversation) return res.status(404).json({ error: "Conversation not found" });

    const isAdmin = req.user.role === "ADMIN";
    const isParticipant = conversation.posterId === req.user.id || conversation.taskerId === req.user.id;
    if (!isAdmin && !isParticipant) return res.status(403).json({ error: "Forbidden" });

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "asc" },
    });

    let canMessage = true;
    let messagingBlockedReason = null;

    if (conversation.task) {
      if (conversation.task.status === "COMPLETED") {
        canMessage = false;
        messagingBlockedReason = "This task has been completed. Messaging is disabled.";
      } else {
        const hasAcceptedOffer = conversation.task.offers.some((o) => o.status === "ACCEPTED");
        if (!hasAcceptedOffer) {
          canMessage = false;
          messagingBlockedReason = "Messaging will be enabled once the offer is accepted.";
        }
      }
    }

    return res.json({ messages, canMessage, messagingBlockedReason, taskStatus: conversation.task?.status || null });
  } catch (err) {
    console.error("[MESSAGES/GET]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send a message in a conversation
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [conversationId]
 *             properties:
 *               conversationId:
 *                 type: string
 *               content:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *                 description: URL of an uploaded image
 *     responses:
 *       201:
 *         description: Message sent (also triggers Pusher real-time event)
 *       403:
 *         description: Not a participant, or messaging blocked
 *       404:
 *         description: Conversation not found
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { content, conversationId, imageUrl } = req.body;
    if (!conversationId) return res.status(400).json({ error: "Conversation ID required" });
    if (!content && !imageUrl) return res.status(400).json({ error: "Content or image required" });

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        task: {
          include: { offers: { where: { OR: [{ userId: req.user.id }, { task: { userId: req.user.id } }] } } },
        },
      },
    });

    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    if (conversation.posterId !== req.user.id && conversation.taskerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    if (conversation.task) {
      if (conversation.task.status === "COMPLETED") return res.status(403).json({ error: "Cannot send messages. This task has been completed." });
      const hasAcceptedOffer = conversation.task.offers.some((o) => o.status === "ACCEPTED");
      if (!hasAcceptedOffer) return res.status(403).json({ error: "Cannot send messages. Wait for the offer to be accepted." });
    }

    const message = await prisma.message.create({
      data: { content: content || "", imageUrl: imageUrl || null, conversationId, senderId: req.user.id },
      include: { sender: { select: { id: true, name: true, image: true } } },
    });

    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

    const recipientId = conversation.posterId === req.user.id ? conversation.taskerId : conversation.posterId;
    pusherServer.trigger(`chat-${conversationId}`, "new-message", message).catch(console.error);
    pusherServer.trigger(`user-${recipientId}-notifications`, "new-message-alert", { taskId: conversation.taskId, conversationId: conversation.id, message }).catch(console.error);

    return res.status(201).json(message);
  } catch (err) {
    console.error("[MESSAGES/POST]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/messages/unread-count:
 *   get:
 *     summary: Get total unread message count for the current user
 *     tags: [Messages]
 *     responses:
 *       200:
 *         description: Unread count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 */
router.get("/unread-count", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const unreadCount = await prisma.message.count({
      where: {
        OR: [
          { conversation: { posterId: userId }, senderId: { not: userId }, isRead: false },
          { conversation: { taskerId: userId }, senderId: { not: userId }, isRead: false },
        ],
      },
    });
    return res.json({ count: unreadCount });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

export default router;
