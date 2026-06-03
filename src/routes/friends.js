import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Friends
 *   description: Friend requests and connections between users
 */

/**
 * @swagger
 * /api/friends:
 *   get:
 *     summary: Get all friendships for the current user
 *     tags: [Friends]
 *     responses:
 *       200:
 *         description: List of friendships (sent and received)
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ senderId: req.user.id }, { receiverId: req.user.id }] },
      include: {
        sender: { select: { id: true, name: true, image: true } },
        receiver: { select: { id: true, name: true, image: true } },
      },
    });
    return res.json(friendships);
  } catch {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/friends:
 *   post:
 *     summary: Send a friend request
 *     tags: [Friends]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [receiverId]
 *             properties:
 *               receiverId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Friend request sent
 *       400:
 *         description: Request already exists or self-add attempt
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { receiverId } = req.body;
    if (!receiverId) return res.status(400).json({ error: "Receiver ID required" });
    if (req.user.id === receiverId) return res.status(400).json({ error: "Cannot add yourself" });

    const existing = await prisma.friendship.findFirst({
      where: { OR: [{ senderId: req.user.id, receiverId }, { senderId: receiverId, receiverId: req.user.id }] },
    });
    if (existing) return res.status(400).json({ error: "Request already exists", status: existing.status });

    const friendship = await prisma.$transaction(async (tx) => {
      const f = await tx.friendship.create({ data: { senderId: req.user.id, receiverId, status: "PENDING" } });
      await tx.notification.create({
        data: {
          userId: receiverId,
          type: "FRIEND_REQUEST",
          title: "New Friend Request",
          message: `${req.user.name} sent you a friend request.`,
          data: { senderId: req.user.id },
        },
      });
      return f;
    });

    return res.status(201).json(friendship);
  } catch {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/friends:
 *   patch:
 *     summary: Accept or reject a friend request
 *     tags: [Friends]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [requestId, status]
 *             properties:
 *               requestId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACCEPTED, REJECTED]
 *     responses:
 *       200:
 *         description: Friendship updated
 *       403:
 *         description: Only the receiver can respond
 *       404:
 *         description: Request not found
 */
router.patch("/", requireAuth, async (req, res) => {
  try {
    const { requestId, status } = req.body;
    if (!requestId || !status) return res.status(400).json({ error: "Missing parameters" });

    const friendship = await prisma.friendship.findUnique({ where: { id: requestId } });
    if (!friendship) return res.status(404).json({ error: "Request not found" });
    if (friendship.receiverId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.friendship.update({ where: { id: requestId }, data: { status } });
      if (status === "ACCEPTED") {
        await tx.notification.create({
          data: {
            userId: friendship.senderId,
            type: "FRIEND_ACCEPT",
            title: "Friend Request Accepted",
            message: `${req.user.name} accepted your friend request.`,
            data: { receiverId: req.user.id },
          },
        });
      }
      return u;
    });

    return res.json(updated);
  } catch {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
