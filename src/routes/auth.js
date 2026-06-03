import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { signToken, requireAuth } from "../lib/auth.js";
import { sendPasswordResetEmail } from "../lib/mail.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Missing fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = await signToken(user.id);
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        verificationStatus: user.verificationStatus,
        selectedCategories: user.selectedCategories,
      },
    });
  } catch (err) {
    console.error("[AUTH/LOGIN]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Send a password reset code to email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset code sent (always returns 200 to prevent user enumeration)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ message: "If an account exists, a reset code has been sent." });

    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 3600000);

    await prisma.verificationToken.deleteMany({ where: { email } });
    await prisma.verificationToken.create({ data: { email, token, expires } });

    await sendPasswordResetEmail(email, token);
    return res.json({ message: "If an account exists, a reset code has been sent." });
  } catch (err) {
    console.error("[AUTH/FORGOT-PASSWORD]", err);
    return res.status(500).json({ error: "An error occurred. Please try again later." });
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using the emailed code
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, token, newPassword]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               token:
 *                 type: string
 *                 description: 6-digit reset code
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) return res.status(400).json({ error: "All fields are required" });

    const verificationToken = await prisma.verificationToken.findUnique({ where: { token } });
    if (!verificationToken || verificationToken.email !== email || verificationToken.expires < new Date()) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { email }, data: { passwordHash: hashedPassword } });
    await prisma.verificationToken.delete({ where: { id: verificationToken.id } });

    return res.json({ message: "Password reset successful. You can now login." });
  } catch (err) {
    console.error("[AUTH/RESET-PASSWORD]", err);
    return res.status(500).json({ error: "An error occurred. Please try again later." });
  }
});

/**
 * @swagger
 * /api/auth/refresh-session:
 *   post:
 *     summary: Refresh the current session and get a new token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: New token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 dbStatus:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.post("/refresh-session", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, verificationStatus: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Issue a fresh token
    const token = await signToken(user.id);
    return res.json({ success: true, token, dbStatus: user.verificationStatus });
  } catch (err) {
    console.error("[AUTH/REFRESH-SESSION]", err);
    return res.status(500).json({ error: "Failed to refresh session" });
  }
});

/**
 * @swagger
 * /api/auth/verify/confirm:
 *   post:
 *     summary: Confirm phone number with OTP
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, otp]
 *             properties:
 *               phone:
 *                 type: string
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP
 *     responses:
 *       200:
 *         description: Phone verified
 *       400:
 *         description: Invalid or expired OTP
 */
router.post("/verify/confirm", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: "Phone and OTP required" });

    const record = await prisma.verificationToken.findFirst({ where: { phone, token: otp } });
    if (!record || record.expires < new Date()) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    await prisma.user.update({ where: { phoneNumber: phone }, data: { isPhoneVerified: true } });
    await prisma.verificationToken.delete({ where: { id: record.id } });

    return res.json({ success: true, message: "Phone verified successfully" });
  } catch (err) {
    console.error("[AUTH/VERIFY/CONFIRM]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/auth/verify/resend:
 *   post:
 *     summary: Resend phone OTP
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP resent
 */
router.post("/verify/resend", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.verificationToken.deleteMany({ where: { phone } });
    await prisma.verificationToken.create({ data: { phone, token: otp, expires } });

    const { sendSMS } = await import("../lib/sms.js");
    await sendSMS(phone, `Your Tasker verification code is: ${otp}`);

    return res.json({ success: true, message: "OTP resent" });
  } catch (err) {
    console.error("[AUTH/VERIFY/RESEND]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
