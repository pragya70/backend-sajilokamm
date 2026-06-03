import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { signToken } from "../lib/auth.js";
import bcrypt from "bcryptjs";
import { z } from "zod";

const router = Router();

// POST /api/mobile/auth/login
router.post("/auth/login", async (req, res) => {
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
      user: { id: user.id, name: user.name, email: user.email, role: user.role, image: user.image, verificationStatus: user.verificationStatus, selectedCategories: user.selectedCategories },
    });
  } catch (err) {
    console.error("[MOBILE/AUTH/LOGIN]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/mobile/auth/register
router.post("/auth/register", async (req, res) => {
  try {
    const registerSchema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      phoneNumber: z.string().regex(/^[0-9]{10}$/),
      role: z.enum(["POSTER", "TASKER"]).default("POSTER"),
      selectedCategories: z.array(z.string()).optional(),
    });

    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const { name, email, password, role, phoneNumber, selectedCategories } = parsed.data;

    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { phoneNumber }] } });
    if (existing) return res.status(400).json({ error: "Email or phone already in use" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, phoneNumber, passwordHash, role, selectedCategories: selectedCategories || [], verificationStatus: "UNVERIFIED" },
    });

    const token = await signToken(user.id);
    return res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, verificationStatus: user.verificationStatus },
    });
  } catch (err) {
    console.error("[MOBILE/AUTH/REGISTER]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/mobile/auth/logout
router.post("/auth/logout", requireAuth, async (_req, res) => {
  // JWT is stateless — client just discards the token
  return res.json({ success: true, message: "Logged out successfully" });
});

// GET /api/mobile/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const fullUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, image: true, role: true, rating: true, reviewCount: true, verificationStatus: true, badges: true, selectedCategories: true, bio: true, phoneNumber: true, isPhoneVerified: true },
    });
    if (!fullUser) return res.status(404).json({ error: "User not found" });
    return res.json(fullUser);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
