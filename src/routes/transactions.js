import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { calculateFees } from "../lib/platform.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Escrow transactions and payouts
 */

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get transactions for the current user
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [POSTER, TASKER, ADMIN]
 *         description: View as a specific role (defaults to user's own role)
 *     responses:
 *       200:
 *         description: List of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const roleParam = req.query.role;
    const role = roleParam || userRole;

    let transactions;

    if (role === "POSTER" || role === "ADMIN") {
      const where = role === "ADMIN" ? {} : { posterId: userId };
      transactions = await prisma.transaction.findMany({
        where,
        include: {
          task: { select: { id: true, title: true, status: true } },
          tasker: { select: { id: true, name: true, email: true, image: true, verificationStatus: true } },
          poster: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (role === "TASKER") {
      transactions = await prisma.transaction.findMany({
        where: { taskerId: userId },
        include: {
          task: { select: { id: true, title: true, status: true } },
          poster: { select: { id: true, name: true, email: true, image: true } },
          tasker: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      const [posterTx, taskerTx] = await Promise.all([
        prisma.transaction.findMany({ where: { posterId: userId }, include: { task: { select: { id: true, title: true, status: true } }, tasker: { select: { id: true, name: true, email: true, image: true, verificationStatus: true } }, poster: { select: { id: true, name: true, email: true } } } }),
        prisma.transaction.findMany({ where: { taskerId: userId }, include: { task: { select: { id: true, title: true, status: true } }, poster: { select: { id: true, name: true, email: true, image: true } }, tasker: { select: { id: true, name: true, email: true } } } }),
      ]);
      transactions = [...posterTx, ...taskerTx].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return res.json({ transactions });
  } catch (err) {
    console.error("[TRANSACTIONS/GET]", err);
    return res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

/**
 * @swagger
 * /api/transactions/{id}/release:
 *   post:
 *     summary: Release escrowed funds to the tasker (poster only)
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment released
 *       400:
 *         description: Transaction not in escrow
 *       403:
 *         description: Only the poster can release funds
 *       404:
 *         description: Transaction not found
 */
router.post("/:id/release", requireAuth, async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: { task: true, poster: true, tasker: true },
    });

    if (!transaction) return res.status(404).json({ error: "Transaction not found" });
    if (transaction.posterId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
    if (transaction.status !== "ESCROW_HELD") return res.status(400).json({ error: "Transaction is not in escrow" });

    const { platformFee, taskerPayout } = calculateFees(transaction.amount);

    const updated = await prisma.transaction.update({
      where: { id: req.params.id },
      data: { status: "RELEASED", platformFee, taskerPayout, releasedAt: new Date() },
    });

    const { sendFinalCompletionNotice } = await import("../lib/mail.js");
    sendFinalCompletionNotice(transaction.poster.email, transaction.tasker.email, transaction.task.title, transaction.amount).catch(console.error);

    return res.json(updated);
  } catch (err) {
    console.error("[TRANSACTIONS/:id/RELEASE]", err);
    return res.status(500).json({ error: "Failed to release payment" });
  }
});

/**
 * @swagger
 * /api/transactions/{id}/initiate-payout:
 *   post:
 *     summary: Create a payout record for a released transaction
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Payout initiated
 *       400:
 *         description: Transaction not yet released
 *       404:
 *         description: Transaction not found
 */
router.post("/:id/initiate-payout", requireAuth, async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!transaction) return res.status(404).json({ error: "Transaction not found" });
    if (transaction.status !== "RELEASED") return res.status(400).json({ error: "Transaction not released yet" });

    const payout = await prisma.payout.create({
      data: {
        transactionId: req.params.id,
        taskerId: transaction.taskerId,
        amount: transaction.taskerPayout,
        method: "KHALTI",
        status: "PENDING",
      },
    });

    return res.status(201).json(payout);
  } catch (err) {
    console.error("[TRANSACTIONS/:id/INITIATE-PAYOUT]", err);
    return res.status(500).json({ error: "Failed to initiate payout" });
  }
});

export default router;
