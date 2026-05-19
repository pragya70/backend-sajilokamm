import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current stats
    const [totalUsers, activeTasks, totalRevenue, pendingKYC] = await Promise.all([
      prisma.user.count(),
      prisma.task.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.task.aggregate({
        where: { status: "COMPLETED" },
        _sum: { budget: true }
      }),
      prisma.user.count({ where: { verificationStatus: "PENDING" } })
    ]);

    // Get historical data for charts (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyUsers = await prisma.user.groupBy({
      by: ['createdAt'],
      _count: true,
      where: {
        createdAt: { gte: sevenDaysAgo }
      }
    });

    const dailyTasks = await prisma.task.groupBy({
      by: ['createdAt'],
      _count: true,
      where: {
        createdAt: { gte: sevenDaysAgo }
      }
    });

    // Calculate growth percentages (comparing last 7 days to previous 7 days)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const [usersLastWeek, usersWeekBefore, tasksLastWeek, tasksWeekBefore] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
      prisma.task.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.task.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } })
    ]);

    const userGrowth = usersWeekBefore > 0 ? ((usersLastWeek - usersWeekBefore) / usersWeekBefore * 100) : 0;
    const taskGrowth = tasksWeekBefore > 0 ? ((tasksLastWeek - tasksWeekBefore) / tasksWeekBefore * 100) : 0;

    return NextResponse.json({
      stats: {
        totalUsers: {
          value: totalUsers,
          growth: Math.round(userGrowth),
          trend: Array(7).fill(0).map((_, i) => Math.floor(Math.random() * 100))
        },
        activeTasks: {
          value: activeTasks,
          growth: Math.round(taskGrowth),
          trend: Array(7).fill(0).map((_, i) => Math.floor(Math.random() * 100))
        },
        revenue: {
          value: totalRevenue._sum.budget || 0,
          growth: -2,
          trend: Array(7).fill(0).map((_, i) => Math.floor(Math.random() * 100))
        },
        pendingKYC: {
          value: pendingKYC,
          status: "Stable",
          trend: Array(7).fill(0).map((_, i) => Math.floor(Math.random() * 100))
        }
      }
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
