import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";

const router = Router();

// Only available in development
router.post("/create-test-data", async (_req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Not available in production" });
  }

  try {
    const passwordHash = await bcrypt.hash("Test123!", 10);

    const poster = await prisma.user.upsert({
      where: { email: "poster@test.com" },
      update: {},
      create: { name: "Test Poster", email: "poster@test.com", passwordHash, role: "POSTER", verificationStatus: "VERIFIED", selectedCategories: [] },
    });

    const tasker = await prisma.user.upsert({
      where: { email: "tasker@test.com" },
      update: {},
      create: { name: "Test Tasker", email: "tasker@test.com", passwordHash, role: "TASKER", verificationStatus: "VERIFIED", selectedCategories: ["Home Services"] },
    });

    return res.json({ success: true, poster: { id: poster.id, email: poster.email }, tasker: { id: tasker.id, email: tasker.email } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
