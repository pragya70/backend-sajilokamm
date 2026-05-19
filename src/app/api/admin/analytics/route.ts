import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/analytics
 * Get platform analytics and statistics (Admin only)
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    // Get counts
    const [
      totalUsers,
      totalPosters,
      totalTaskers,
      totalAdmins,
      totalTasks,
      openTasks,
      completedTasks,
      pendingTasks,
      totalOffers,
      acceptedOffers,
      totalTransactions,
      pendingKYC,
      verifiedUsers,
      totalRevenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "POSTER" } }),
      prisma.user.count({ where: { role: "TASKER" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.task.count(),
      prisma.task.count({ where: { status: "OPEN" } }),
      prisma.task.count({ where: { status: "COMPLETED" } }),
      prisma.task.count({ where: { status: "PENDING_APPROVAL" } }),
      prisma.offer.count(),
      prisma.offer.count({ where: { status: "ACCEPTED" } }),
      prisma.transaction.count(),
      prisma.user.count({ where: { verificationStatus: "PENDING" } }),
      prisma.user.count({ where: { verificationStatus: "VERIFIED" } }),
      prisma.transaction.aggregate({
        _sum: { platformFee: true },
      }),
    ]);

    // Get recent activities
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const recentTasks = await prisma.task.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        budget: true,
        status: true,
        createdAt: true,
        user: {
          select: { name: true },
        },
      },
    });

    const recentTransactions = await prisma.transaction.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        platformFee: true,
        method: true,
        createdAt: true,
        poster: {
          select: { name: true },
        },
        tasker: {
          select: { name: true },
        },
      },
    });

    // Get task status distribution
    const tasksByStatus = await prisma.task.groupBy({
      by: ["status"],
      _count: true,
    });

    // Get user role distribution
    const usersByRole = await prisma.user.groupBy({
      by: ["role"],
      _count: true,
    });

    const analytics = {
      overview: {
        totalUsers,
        totalPosters,
        totalTaskers,
        totalAdmins,
        totalTasks,
        openTasks,
        completedTasks,
        pendingTasks,
        totalOffers,
        acceptedOffers,
        totalTransactions,
        pendingKYC,
        verifiedUsers,
        totalRevenue: totalRevenue._sum.platformFee || 0,
      },
      recentActivity: {
        users: recentUsers,
        tasks: recentTasks,
        transactions: recentTransactions,
      },
      distributions: {
        tasksByStatus: tasksByStatus.map((item) => ({
          status: item.status,
          count: item._count,
        })),
        usersByRole: usersByRole.map((item) => ({
          role: item.role,
          count: item._count,
        })),
      },
    };

    return NextResponse.json({ success: true, analytics });
  } catch (error) {
    console.error("[ADMIN-ANALYTICS] Error fetching analytics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
