import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import bcrypt from "bcryptjs";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User profile and account management
 */

/**
 * @swagger
 * /api/user/me:
 *   get:
 *     summary: Get the current user's avatar image
 *     tags: [User]
 *     responses:
 *       200:
 *         description: User image URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 image:
 *                   type: string
 *                   nullable: true
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { image: true } });
    return res.json({ image: dbUser?.image ?? null });
  } catch {
    return res.json({ image: null });
  }
});

/**
 * @swagger
 * /api/user/profile:
 *   patch:
 *     summary: Update the current user's profile
 *     tags: [User]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               bio:
 *                 type: string
 *               image:
 *                 type: string
 *               coverImage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.patch("/profile", requireAuth, async (req, res) => {
  try {
    const { bio, image, coverImage, name } = req.body;
    const data = {};
    if (bio !== undefined) data.bio = bio;
    if (image !== undefined) data.image = image;
    if (coverImage !== undefined) data.coverImage = coverImage;
    if (name !== undefined) data.name = name;

    const updated = await prisma.user.update({ where: { id: req.user.id }, data });
    return res.json({ success: true, image: updated.image, bio: updated.bio, name: updated.name });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/user/change-password:
 *   post:
 *     summary: Change the current user's password
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Wrong current password or validation error
 */
router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Current password and new password are required" });
    if (newPassword.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, passwordHash: true } });
    if (!user || !user.passwordHash) return res.status(404).json({ error: "User not found" });

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) return res.status(400).json({ error: "Current password is incorrect" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: hashedPassword } });

    return res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("[USER/CHANGE-PASSWORD]", err);
    return res.status(500).json({ error: "Failed to change password" });
  }
});

/**
 * @swagger
 * /api/user/kyc:
 *   get:
 *     summary: Get the current user's submitted KYC data
 *     tags: [User]
 *     responses:
 *       200:
 *         description: KYC record
 */
router.get("/kyc", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { kycFullName: true, kycDocumentType: true, kycDocumentNumber: true, kycDob: true, kycDocumentUrl: true, verificationStatus: true },
    });
    return res.json(user);
  } catch {
    return res.status(500).json({ error: "Failed to fetch KYC data" });
  }
});

/**
 * @swagger
 * /api/user/kyc-status:
 *   get:
 *     summary: Get the current user's KYC verification status
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Verification status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 verificationStatus:
 *                   type: string
 *                   enum: [UNVERIFIED, PENDING, VERIFIED, REJECTED]
 */
router.get("/kyc-status", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { verificationStatus: true } });
    return res.json({ verificationStatus: user?.verificationStatus });
  } catch {
    return res.status(500).json({ error: "Failed to fetch KYC status" });
  }
});

/**
 * @swagger
 * /api/user/payment-details:
 *   get:
 *     summary: Get the current user's payout details
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Payment details
 */
router.get("/payment-details", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { khaltiPhone: true, khaltiAccountName: true, bankName: true, bankAccountNumber: true, bankAccountName: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user);
  } catch {
    return res.status(500).json({ error: "Failed to fetch payment details" });
  }
});

/**
 * @swagger
 * /api/user/payment-details:
 *   put:
 *     summary: Save or update the current user's payout details
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               khaltiPhone:
 *                 type: string
 *                 description: 10-digit Khalti phone starting with 98
 *               khaltiAccountName:
 *                 type: string
 *               bankName:
 *                 type: string
 *               bankAccountNumber:
 *                 type: string
 *               bankAccountName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment details saved
 *       400:
 *         description: Validation error
 */
router.put("/payment-details", requireAuth, async (req, res) => {
  try {
    const { khaltiPhone, khaltiAccountName, bankName, bankAccountNumber, bankAccountName } = req.body;
    if (!khaltiPhone && !bankAccountNumber) return res.status(400).json({ error: "Please provide either Khalti phone number or bank account details" });
    if (khaltiPhone && !/^98\d{8}$/.test(khaltiPhone)) return res.status(400).json({ error: "Invalid Khalti phone number. Must be 10 digits starting with 98" });

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { khaltiPhone: khaltiPhone || null, khaltiAccountName: khaltiAccountName || null, bankName: bankName || null, bankAccountNumber: bankAccountNumber || null, bankAccountName: bankAccountName || null },
      select: { khaltiPhone: true, khaltiAccountName: true, bankName: true, bankAccountNumber: true, bankAccountName: true },
    });

    return res.json({ success: true, message: "Payment details updated successfully", data: updated });
  } catch {
    return res.status(500).json({ error: "Failed to update payment details" });
  }
});

export default router;
