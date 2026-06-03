import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { stripe } from "../lib/stripe.js";
import { buildEsewaPayload, verifyEsewaResponse } from "../lib/esewa.js";
import { initiateKhaltiPayment, lookupKhaltiPayment } from "../lib/khalti.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment initiation via Stripe, eSewa, and Khalti
 */

/**
 * @swagger
 * /api/payments/intent:
 *   post:
 *     summary: Create a Stripe payment intent for a task
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taskId]
 *             properties:
 *               taskId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stripe client secret
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clientSecret:
 *                   type: string
 *       403:
 *         description: Not the task owner
 */
router.post("/intent", requireAuth, async (req, res) => {
  try {
    const { taskId } = req.body;
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(task.budget * 100),
      currency: "usd",
      metadata: { taskId, userId: req.user.id },
      capture_method: "manual",
    });

    await prisma.task.update({ where: { id: taskId }, data: { stripePaymentIntentId: paymentIntent.id } });
    return res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("[PAYMENTS/INTENT]", err);
    return res.status(500).json({ error: "Failed to create payment intent" });
  }
});

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Stripe webhook receiver (called by Stripe only)
 *     tags: [Payments]
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook received
 *       400:
 *         description: Invalid signature
 */
router.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.status(400).json({ error: "Webhook signature failed" });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    const task = await prisma.task.findFirst({ where: { stripePaymentIntentId: pi.id }, select: { id: true } });
    if (task) await prisma.task.update({ where: { id: task.id }, data: { status: "COMPLETED" } });
  }

  return res.json({ received: true });
});

/**
 * @swagger
 * /api/payments/esewa/initiate:
 *   post:
 *     summary: Get eSewa payment form payload for a task
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taskId]
 *             properties:
 *               taskId:
 *                 type: string
 *     responses:
 *       200:
 *         description: eSewa gateway URL and signed payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 gatewayUrl:
 *                   type: string
 *                 payload:
 *                   type: object
 *       403:
 *         description: Not the task owner
 */
router.post("/esewa/initiate", requireAuth, async (req, res) => {
  try {
    const { taskId } = req.body;
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    const { gatewayUrl, payload } = buildEsewaPayload(task.budget, taskId);
    return res.json({ gatewayUrl, payload });
  } catch (err) {
    return res.status(500).json({ error: "Failed to initiate eSewa payment" });
  }
});

/**
 * @swagger
 * /api/payments/esewa/success:
 *   get:
 *     summary: eSewa payment success redirect handler
 *     tags: [Payments]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: taskId
 *         schema:
 *           type: string
 *       - in: query
 *         name: data
 *         schema:
 *           type: string
 *         description: Base64-encoded eSewa response
 *     responses:
 *       302:
 *         description: Redirects to frontend payment-success page
 */
router.get("/esewa/success", async (req, res) => {
  try {
    const { taskId, data: encodedData } = req.query;
    if (!taskId) return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/payment-success?status=failed&reason=missing_task`);

    let verified = false;
    if (encodedData) {
      const decoded = JSON.parse(Buffer.from(encodedData, "base64").toString("utf-8"));
      verified = verifyEsewaResponse(decoded);
      if (verified) {
        await prisma.task.update({ where: { id: taskId }, data: { esewaRefId: decoded.transaction_uuid, status: "IN_PROGRESS" } });
      }
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    return res.redirect(`${frontendUrl}/payment-success?taskId=${taskId}&status=${verified ? "success" : "failed"}`);
  } catch (err) {
    console.error("[ESEWA/SUCCESS]", err);
    return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/payment-success?status=error`);
  }
});

/**
 * @swagger
 * /api/payments/esewa/failure:
 *   get:
 *     summary: eSewa payment failure redirect handler
 *     tags: [Payments]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: taskId
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirects to frontend with failed status
 */
router.get("/esewa/failure", async (req, res) => {
  const { taskId } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  return res.redirect(`${frontendUrl}/payment-success?taskId=${taskId}&status=failed`);
});

/**
 * @swagger
 * /api/payments/khalti/initiate:
 *   post:
 *     summary: Initiate a Khalti payment for a task
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taskId]
 *             properties:
 *               taskId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Khalti payment URL and pidx
 *       403:
 *         description: Not the task owner
 */
router.post("/khalti/initiate", requireAuth, async (req, res) => {
  try {
    const { taskId } = req.body;
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true, email: true, phoneNumber: true } });

    const result = await initiateKhaltiPayment({
      taskId,
      taskTitle: task.title,
      amountNPR: task.budget,
      customerName: user.name,
      customerEmail: user.email,
      customerPhone: user.phoneNumber,
    });

    await prisma.task.update({ where: { id: taskId }, data: { khaltiPidx: result.pidx } });
    return res.json(result);
  } catch (err) {
    console.error("[KHALTI/INITIATE]", err);
    return res.status(500).json({ error: err.message || "Failed to initiate Khalti payment" });
  }
});

/**
 * @swagger
 * /api/payments/khalti/callback:
 *   get:
 *     summary: Khalti payment callback redirect handler
 *     tags: [Payments]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: pidx
 *         schema:
 *           type: string
 *       - in: query
 *         name: taskId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirects to frontend payment-success page
 */
router.get("/khalti/callback", async (req, res) => {
  try {
    const { pidx, taskId, status } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    if (status === "Completed" && pidx) {
      const lookup = await lookupKhaltiPayment(pidx);
      if (lookup.status === "Completed") {
        await prisma.task.update({ where: { id: taskId }, data: { khaltiPidx: pidx, status: "IN_PROGRESS" } });
        return res.redirect(`${frontendUrl}/payment-success?taskId=${taskId}&status=success`);
      }
    }

    return res.redirect(`${frontendUrl}/payment-success?taskId=${taskId}&status=failed`);
  } catch (err) {
    console.error("[KHALTI/CALLBACK]", err);
    return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/payment-success?status=error`);
  }
});

export default router;
