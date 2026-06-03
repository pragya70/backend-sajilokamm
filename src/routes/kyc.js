import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: KYC
 *   description: Know Your Customer identity verification
 */

/**
 * @swagger
 * /api/kyc/submit:
 *   post:
 *     summary: Submit KYC documents for verification
 *     tags: [KYC]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, documentType, documentNumber, dob, kycDocumentUrl]
 *             properties:
 *               fullName:
 *                 type: string
 *               documentType:
 *                 type: string
 *                 example: CITIZENSHIP
 *               documentNumber:
 *                 type: string
 *               dob:
 *                 type: string
 *                 format: date
 *               kycDocumentUrl:
 *                 type: string
 *                 description: URL of the uploaded document image
 *     responses:
 *       200:
 *         description: KYC submitted, status set to PENDING
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Missing required fields
 */
router.post("/submit", requireAuth, async (req, res) => {
  try {
    const { fullName, documentType, documentNumber, dob, kycDocumentUrl } = req.body;
    if (!fullName || !documentType || !documentNumber || !dob || !kycDocumentUrl) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        kycFullName: fullName,
        kycDocumentType: documentType,
        kycDocumentNumber: documentNumber,
        kycDob: new Date(dob),
        kycDocumentUrl,
        verificationStatus: "PENDING",
      },
      select: { id: true, name: true, email: true, verificationStatus: true },
    });

    await prisma.notification.create({
      data: {
        userId: req.user.id,
        type: "TASK_ALERT",
        title: "KYC Submitted",
        message: "Your KYC documents have been submitted for review. You'll be notified once verified.",
      },
    }).catch(console.error);

    const { sendKYCModerationAlert } = await import("../lib/mail.js");
    sendKYCModerationAlert(user.name).catch(console.error);

    return res.json({ success: true, message: "KYC submitted successfully", user });
  } catch (err) {
    console.error("[KYC/SUBMIT]", err);
    return res.status(500).json({ success: false, error: "Failed to submit KYC" });
  }
});

export default router;
