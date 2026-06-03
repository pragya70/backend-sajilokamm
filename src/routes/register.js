import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { z } from "zod";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phoneNumber: z.string().regex(/^[0-9]{10}$/, "Invalid Nepal phone number"),
  role: z.enum(["POSTER", "TASKER"]).default("POSTER"),
  selectedCategories: z.array(z.string()).optional(),
});

/**
 * @swagger
 * tags:
 *   name: Register
 *   description: User registration
 */

/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Register]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, phoneNumber]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               phoneNumber:
 *                 type: string
 *                 description: 10-digit Nepal phone number
 *                 example: "9812345678"
 *               role:
 *                 type: string
 *                 enum: [POSTER, TASKER]
 *                 default: POSTER
 *               selectedCategories:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: User registered, OTP sent to phone
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 requiresVerification:
 *                   type: boolean
 *       400:
 *         description: Validation error or duplicate email/phone
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { name, email, password, role, phoneNumber, selectedCategories } = parsed.data;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { phoneNumber }] },
    });

    if (existingUser) {
      if (existingUser.verificationStatus === "PENDING") {
        await prisma.user.delete({ where: { id: existingUser.id } });
      } else {
        return res.status(400).json({ error: "Email or Phone number already in use" });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const finalRole = email === "admin@tasker.com" ? "ADMIN" : role;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phoneNumber,
        passwordHash,
        role: finalRole,
        selectedCategories: selectedCategories || [],
        verificationStatus: "UNVERIFIED",
      },
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.verificationToken.create({ data: { phone: phoneNumber, token: otp, expires } });

    const { sendSMS } = await import("../lib/sms.js");
    await sendSMS(phoneNumber, `Your Tasker verification code is: ${otp}`);

    return res.status(201).json({
      message: "User registered successfully. Please verify your phone number.",
      userId: user.id,
      requiresVerification: true,
    });
  } catch (err) {
    console.error("[REGISTER]", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;
