import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

const ROLE_TYPES = {
  ADMIN: ["KYC_SUBMITTED","KYC_APPROVED","KYC_REJECTED","TASK_FLAGGED","TASK_POSTED","USER_REPORTED","PAYMENT_ISSUE","SYSTEM_ALERT","DISPUTE_OPENED","DISPUTE_RESOLVED"],
  POSTER: ["OFFER_RECEIVED","TASK_COMPLETED","TASK_STARTED","PAYMENT_RECEIVED","REVIEW_RECEIVED","NEW_OFFER","OFFER_ACCEPTED","NEW_MESSAGE","NEW_COMMENT","TASK_ALERT","TASK_CANCELLED","FRIEND_REQUEST","FRIEND_ACCEPT"],
  TASKER: ["TASK_ASSIGNED","PAYMENT_RELEASED","TASK_DEADLINE","PROFILE_VIEWED","OFFER_ACCEPTED","NEW_MESSAGE","REVIEW_RECEIVED","TASK_ALERT","FRIEND_REQUEST","FRIEND_ACCEPT"],
};

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: In-app notifications
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get notifications for the current user (last 20, filtered by role)
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *         description: If true, return only unread notifications
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   type:
 *                     type: string
 *                   title:
 *                     type: string
 *                   message:
 *                     type: string
 *                   read:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const unreadOnly = req.query.unreadOnly === "true";

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const allowedTypes = ROLE_TYPES[user.role] || ROLE_TYPES.POSTER;
    const filtered = notifications.filter((n) => allowedTypes.includes(n.type));

    return res.json(filtered);
  } catch (err) {
    console.error("[NOTIFICATIONS/GET]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/notifications:
 *   patch:
 *     summary: Mark notification(s) as read
 *     tags: [Notifications]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notificationId:
 *                 type: string
 *                 description: If omitted, all unread notifications are marked as read
 *     responses:
 *       200:
 *         description: Marked as read
 */
router.patch("/", requireAuth, async (req, res) => {
  try {
    const { notificationId } = req.body;
    if (notificationId) {
      await prisma.notification.update({ where: { id: notificationId, userId: req.user.id }, data: { read: true } });
    } else {
      await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
    }
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
