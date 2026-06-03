import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../lib/auth.js";
import { createNotification } from "../lib/notifications.js";
import { sendKYCStatusUpdate, sendTaskStatusUpdate } from "../lib/mail.js";

const router = Router();

// ─── Stats ────────────────────────────────────────────────────────────────────
router.get("/stats", requireAdmin, async (_req, res) => {
  try {
    const [totalUsers, activeTasks, totalRevenue, pendingKYC] = await Promise.all([
      prisma.user.count(),
      prisma.task.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.task.aggregate({ where: { status: "COMPLETED" }, _sum: { budget: true } }),
      prisma.user.count({ where: { verificationStatus: "PENDING" } }),
    ]);

    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date(); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const [usersLastWeek, usersWeekBefore, tasksLastWeek, tasksWeekBefore] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
      prisma.task.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.task.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
    ]);

    const userGrowth = usersWeekBefore > 0 ? ((usersLastWeek - usersWeekBefore) / usersWeekBefore * 100) : 0;
    const taskGrowth = tasksWeekBefore > 0 ? ((tasksLastWeek - tasksWeekBefore) / tasksWeekBefore * 100) : 0;

    return res.json({
      stats: {
        totalUsers: { value: totalUsers, growth: Math.round(userGrowth), trend: Array(7).fill(0).map(() => Math.floor(Math.random() * 100)) },
        activeTasks: { value: activeTasks, growth: Math.round(taskGrowth), trend: Array(7).fill(0).map(() => Math.floor(Math.random() * 100)) },
        revenue: { value: totalRevenue._sum.budget || 0, growth: -2, trend: Array(7).fill(0).map(() => Math.floor(Math.random() * 100)) },
        pendingKYC: { value: pendingKYC, status: "Stable", trend: Array(7).fill(0).map(() => Math.floor(Math.random() * 100)) },
      },
    });
  } catch (err) {
    console.error("[ADMIN/STATS]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Users ────────────────────────────────────────────────────────────────────
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "10");
    const { role, status, search } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (role && role !== "All Roles") where.role = role;
    if (status && status !== "All Status") where.verificationStatus = status;
    if (search) where.OR = [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }];

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({ where, take: limit, skip, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, phoneNumber: true, role: true, verificationStatus: true, createdAt: true, rating: true, reviewCount: true } }),
      prisma.user.count({ where }),
    ]);

    return res.json({ users, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:id", requireAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, email: true, phoneNumber: true, role: true, verificationStatus: true, createdAt: true, rating: true, reviewCount: true, bio: true, image: true, kycDocumentUrl: true, kycFullName: true, kycDocumentType: true, kycDocumentNumber: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/users/:id", requireAdmin, async (req, res) => {
  try {
    const { role, verificationStatus } = req.body;
    const data = {};
    if (role) data.role = role;
    if (verificationStatus) data.verificationStatus = verificationStatus;

    const user = await prisma.user.update({ where: { id: req.params.id }, data, select: { id: true, name: true, email: true, role: true, verificationStatus: true } });
    return res.json({ success: true, user });
  } catch {
    return res.status(500).json({ error: "Failed to update user" });
  }
});

// ─── Tasks ────────────────────────────────────────────────────────────────────
router.get("/tasks", requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "10");
    const status = req.query.status || "PENDING_APPROVAL";
    const skip = (page - 1) * limit;

    let where = {};
    if (status === "PENDING_APPROVAL") where.status = "PENDING_APPROVAL";
    else if (status === "APPROVED") where.status = { notIn: ["PENDING_APPROVAL", "REJECTED"] };
    else if (status === "REJECTED") where.status = "REJECTED";

    if (req.query.startDate || req.query.endDate) {
      where.createdAt = {};
      if (req.query.startDate) where.createdAt.gte = new Date(req.query.startDate);
      if (req.query.endDate) { const end = new Date(req.query.endDate); end.setHours(23, 59, 59, 999); where.createdAt.lte = end; }
    }

    const [tasks, totalCount] = await Promise.all([
      prisma.task.findMany({ where, take: limit, skip, orderBy: { createdAt: "desc" }, select: { id: true, title: true, description: true, budget: true, status: true, category: true, expiresAt: true, createdAt: true, user: { select: { id: true, name: true, email: true, verificationStatus: true } } } }),
      prisma.task.count({ where }),
    ]);

    return res.json({ tasks, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/tasks/:id", requireAdmin, async (req, res) => {
  try {
    const { status, reason } = req.body;
    const task = await prisma.task.findUnique({ where: { id: req.params.id }, include: { user: { select: { email: true } } } });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const updated = await prisma.task.update({ where: { id: req.params.id }, data: { status } });

    if (status === "OPEN" || status === "REJECTED") {
      sendTaskStatusUpdate(task.user.email, task.title, status).catch(console.error);
    }

    return res.json({ success: true, task: updated });
  } catch {
    return res.status(500).json({ error: "Failed to update task" });
  }
});

// ─── KYC ─────────────────────────────────────────────────────────────────────
router.get("/kyc", requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "10");
    const verificationStatus = req.query.verificationStatus || "PENDING";
    const skip = (page - 1) * limit;

    const where = { kycDocumentUrl: { not: null }, verificationStatus };

    const [requests, totalCount] = await Promise.all([
      prisma.user.findMany({ where, take: limit, skip, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, role: true, verificationStatus: true, kycDocumentUrl: true, kycFullName: true, kycDocumentType: true, kycDocumentNumber: true, kycDob: true, phoneNumber: true, isPhoneVerified: true, createdAt: true, updatedAt: true } }),
      prisma.user.count({ where }),
    ]);

    return res.json({ success: true, requests, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) });
  } catch {
    return res.status(500).json({ success: false, error: "Failed to fetch KYC submissions" });
  }
});

router.post("/kyc", requireAdmin, async (req, res) => {
  try {
    const { userId, action, reason } = req.body;
    if (!userId || !action) return res.status(400).json({ success: false, error: "User ID and action are required" });

    const status = action === "approve" ? "VERIFIED" : "REJECTED";
    const user = await prisma.user.update({ where: { id: userId }, data: { verificationStatus: status }, select: { id: true, name: true, email: true, verificationStatus: true } });

    sendKYCStatusUpdate(user.email, status).catch(console.error);
    await createNotification({
      userId: user.id,
      type: status === "VERIFIED" ? "KYC_APPROVED" : "KYC_REJECTED",
      title: status === "VERIFIED" ? "KYC Approved ✓" : "KYC Rejected",
      message: status === "VERIFIED" ? "Your identity verification has been approved!" : reason || "Your identity verification was rejected.",
      data: { status, reason },
    });

    return res.json({ success: true, user });
  } catch {
    return res.status(500).json({ success: false, error: "Failed to update KYC status" });
  }
});

router.patch("/kyc", requireAdmin, async (req, res) => {
  try {
    const { userId, status } = req.body;
    if (!userId || !status) return res.status(400).json({ error: "User ID and status are required" });

    const user = await prisma.user.update({ where: { id: userId }, data: { verificationStatus: status }, select: { id: true, name: true, email: true, verificationStatus: true } });

    sendKYCStatusUpdate(user.email, status).catch(console.error);
    await createNotification({
      userId: user.id,
      type: status === "VERIFIED" ? "KYC_APPROVED" : "KYC_REJECTED",
      title: status === "VERIFIED" ? "KYC Approved ✓" : "KYC Rejected",
      message: status === "VERIFIED" ? "Your identity verification has been approved!" : "Your identity verification was rejected.",
      data: { status },
    });

    return res.json({ success: true, user });
  } catch {
    return res.status(500).json({ error: "Failed to update KYC status" });
  }
});

// ─── Categories ───────────────────────────────────────────────────────────────
router.get("/categories", requireAdmin, async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({ include: { subCategories: { orderBy: { name: "asc" } } }, orderBy: { name: "asc" } });
    return res.json({ success: true, categories });
  } catch {
    return res.status(500).json({ success: false, error: "Failed to fetch categories" });
  }
});

router.post("/categories", requireAdmin, async (req, res) => {
  try {
    const { name, slug, description, image, icon, featuredBackground, status = true, promoted = false, metaTitle, metaDescription, subCategories = [] } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Category name is required" });

    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const category = await prisma.category.create({
      data: { name, slug: finalSlug, description, image: featuredBackground || image, icon, status, promoted, metaTitle, metaDescription, subCategories: { create: subCategories.filter((s) => s.name?.trim()).map((s) => ({ name: s.name.trim(), description: s.description || null, status: s.status !== undefined ? s.status : true })) } },
      include: { subCategories: true },
    });
    return res.status(201).json({ success: true, category });
  } catch (err) {
    if (err.code === "P2002") return res.status(400).json({ success: false, error: "Category name or slug already exists" });
    return res.status(500).json({ success: false, error: "Failed to create category" });
  }
});

router.patch("/categories/:id", requireAdmin, async (req, res) => {
  try {
    const { name, slug, description, image, icon, featuredBackground, status, promoted, metaTitle, metaDescription } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    if (description !== undefined) data.description = description;
    if (icon !== undefined) data.icon = icon;
    if (status !== undefined) data.status = status;
    if (promoted !== undefined) data.promoted = promoted;
    if (metaTitle !== undefined) data.metaTitle = metaTitle;
    if (metaDescription !== undefined) data.metaDescription = metaDescription;
    if (image !== undefined || featuredBackground !== undefined) data.image = featuredBackground || image;

    const category = await prisma.category.update({ where: { id: req.params.id }, data, include: { subCategories: true } });
    return res.json({ success: true, category });
  } catch {
    return res.status(500).json({ success: false, error: "Failed to update category" });
  }
});

router.delete("/categories/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Category deleted successfully" });
  } catch {
    return res.status(500).json({ success: false, error: "Failed to delete category" });
  }
});

// ─── Subcategories ────────────────────────────────────────────────────────────
router.get("/subcategories", requireAdmin, async (req, res) => {
  try {
    const where = req.query.categoryId ? { categoryId: req.query.categoryId } : {};
    const subcategories = await prisma.subCategory.findMany({ where, include: { category: { select: { id: true, name: true } } }, orderBy: { name: "asc" } });
    return res.json({ success: true, subcategories });
  } catch {
    return res.status(500).json({ success: false, error: "Failed to fetch subcategories" });
  }
});

router.post("/subcategories", requireAdmin, async (req, res) => {
  try {
    const { name, description, status = true, categoryId } = req.body;
    if (!name || !categoryId) return res.status(400).json({ success: false, error: "Name and category ID are required" });

    const subcategory = await prisma.subCategory.create({ data: { name, categoryId, description: description || null, status }, include: { category: { select: { id: true, name: true } } } });
    return res.status(201).json({ success: true, subcategory });
  } catch (err) {
    if (err.code === "P2002") return res.status(400).json({ success: false, error: "Subcategory already exists in this category" });
    return res.status(500).json({ success: false, error: "Failed to create subcategory" });
  }
});

router.patch("/subcategories/:id", requireAdmin, async (req, res) => {
  try {
    const { name, description, status, categoryId } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;

    const subcategory = await prisma.subCategory.update({ where: { id: req.params.id }, data, include: { category: { select: { id: true, name: true } } } });
    return res.json({ success: true, subcategory });
  } catch {
    return res.status(500).json({ success: false, error: "Failed to update subcategory" });
  }
});

router.delete("/subcategories/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.subCategory.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Subcategory deleted successfully" });
  } catch {
    return res.status(500).json({ success: false, error: "Failed to delete subcategory" });
  }
});

// ─── Analytics ────────────────────────────────────────────────────────────────
router.get("/analytics", requireAdmin, async (_req, res) => {
  try {
    const [totalUsers, totalPosters, totalTaskers, totalAdmins, totalTasks, openTasks, completedTasks, pendingTasks, totalOffers, acceptedOffers, totalTransactions, pendingKYC, verifiedUsers, totalRevenue] = await Promise.all([
      prisma.user.count(), prisma.user.count({ where: { role: "POSTER" } }), prisma.user.count({ where: { role: "TASKER" } }), prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.task.count(), prisma.task.count({ where: { status: "OPEN" } }), prisma.task.count({ where: { status: "COMPLETED" } }), prisma.task.count({ where: { status: "PENDING_APPROVAL" } }),
      prisma.offer.count(), prisma.offer.count({ where: { status: "ACCEPTED" } }), prisma.transaction.count(),
      prisma.user.count({ where: { verificationStatus: "PENDING" } }), prisma.user.count({ where: { verificationStatus: "VERIFIED" } }),
      prisma.transaction.aggregate({ _sum: { platformFee: true } }),
    ]);

    const [recentUsers, recentTasks, recentTransactions, tasksByStatus, usersByRole] = await Promise.all([
      prisma.user.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
      prisma.task.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, title: true, budget: true, status: true, createdAt: true, user: { select: { name: true } } } }),
      prisma.transaction.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, amount: true, platformFee: true, method: true, createdAt: true, poster: { select: { name: true } }, tasker: { select: { name: true } } } }),
      prisma.task.groupBy({ by: ["status"], _count: true }),
      prisma.user.groupBy({ by: ["role"], _count: true }),
    ]);

    return res.json({
      success: true,
      analytics: {
        overview: { totalUsers, totalPosters, totalTaskers, totalAdmins, totalTasks, openTasks, completedTasks, pendingTasks, totalOffers, acceptedOffers, totalTransactions, pendingKYC, verifiedUsers, totalRevenue: totalRevenue._sum.platformFee || 0 },
        recentActivity: { users: recentUsers, tasks: recentTasks, transactions: recentTransactions },
        distributions: { tasksByStatus: tasksByStatus.map((i) => ({ status: i.status, count: i._count })), usersByRole: usersByRole.map((i) => ({ role: i.role, count: i._count })) },
      },
    });
  } catch {
    return res.status(500).json({ success: false, error: "Failed to fetch analytics" });
  }
});

// ─── Audit ────────────────────────────────────────────────────────────────────
router.get("/audit", requireAdmin, async (_req, res) => {
  try {
    const [recentUsers, recentOffers, flaggedTasks] = await Promise.all([
      prisma.user.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, createdAt: true, verificationStatus: true } }),
      prisma.offer.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } }, task: { select: { id: true, title: true } } } }),
      prisma.task.findMany({ take: 5, where: { status: "PENDING_APPROVAL" }, orderBy: { createdAt: "desc" }, select: { id: true, title: true, createdAt: true, status: true } }),
    ]);

    const auditTrail = [
      ...recentUsers.map((u) => ({ id: u.id, type: "User Registration", user: u.name || u.email, timestamp: u.createdAt, status: u.verificationStatus === "VERIFIED" ? "VERIFIED" : "PENDING", action: "view" })),
      ...recentOffers.map((o) => ({ id: o.id, type: "Payout Requested", user: `${o.user.name} (TR-${o.task.id.slice(0, 3)})`, timestamp: o.createdAt, status: "PENDING", action: "review" })),
      ...flaggedTasks.map((t) => ({ id: t.id, type: "Flagged Content", user: `Task ID: #${t.id.slice(0, 4)}`, timestamp: t.createdAt, status: "CRITICAL", action: "review" })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

    return res.json({ auditTrail });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Payouts ─────────────────────────────────────────────────────────────────
router.get("/payouts", requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const skip = (page - 1) * limit;
    const where = req.query.status ? { status: req.query.status } : {};

    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({ where, include: { transaction: { include: { task: { select: { id: true, title: true } }, tasker: { select: { id: true, name: true, email: true, phoneNumber: true } }, poster: { select: { id: true, name: true, email: true } } } } }, orderBy: { createdAt: "desc" }, skip, take: limit }),
      prisma.payout.count({ where }),
    ]);

    return res.json({ payouts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch {
    return res.status(500).json({ error: "Failed to fetch payouts" });
  }
});

router.patch("/payouts/:id", requireAdmin, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const payout = await prisma.payout.update({
      where: { id: req.params.id },
      data: { status, notes, processedBy: req.user.id, processedAt: new Date(), ...(status === "COMPLETED" ? { completedAt: new Date() } : {}) },
    });
    return res.json({ success: true, payout });
  } catch {
    return res.status(500).json({ error: "Failed to update payout" });
  }
});

export default router;
