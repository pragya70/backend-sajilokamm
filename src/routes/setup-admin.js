import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";

const router = Router();

// GET /api/setup-admin — one-time admin setup
router.get("/", async (_req, res) => {
  try {
    const email = "admin@tasker.com";
    const password = "Admin123!";
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: { role: "ADMIN", passwordHash: hashedPassword, verificationStatus: "VERIFIED", isPhoneVerified: true },
      create: { name: "Platform Admin", email, passwordHash: hashedPassword, role: "ADMIN", verificationStatus: "VERIFIED", isPhoneVerified: true },
    });

    return res.json({ success: true, message: "Admin created successfully", credentials: { email: user.email, password } });
  } catch (err) {
    return res.json({ success: false, error: err.message });
  }
});

export default router;
