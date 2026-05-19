import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { timeRange } = await req.json();

    // Calculate date range
    let startDate = new Date();
    if (timeRange === "Last 7 Days") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeRange === "Last 30 Days") {
      startDate.setDate(startDate.getDate() - 30);
    } else if (timeRange === "Last 90 Days") {
      startDate.setDate(startDate.getDate() - 90);
    }

    // Fetch comprehensive data
    const [
      totalUsers,
      newUsers,
      totalTasks,
      activeTasks,
      completedTasks,
      totalRevenue,
      pendingKYC,
      verifiedUsers,
      recentActivities
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startDate } } }),
      prisma.task.count(),
      prisma.task.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.task.count({ where: { status: "COMPLETED", updatedAt: { gte: startDate } } }),
      prisma.task.aggregate({
        where: { status: "COMPLETED", updatedAt: { gte: startDate } },
        _sum: { budget: true }
      }),
      prisma.user.count({ where: { verificationStatus: "PENDING" } }),
      prisma.user.count({ where: { verificationStatus: "VERIFIED" } }),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          name: true,
          email: true,
          role: true,
          createdAt: true,
          verificationStatus: true
        }
      })
    ]);

    // Generate CSV report
    const reportData = {
      generatedAt: new Date().toISOString(),
      timeRange,
      summary: {
        totalUsers,
        newUsers,
        totalTasks,
        activeTasks,
        completedTasks,
        revenue: totalRevenue._sum.budget || 0,
        pendingKYC,
        verifiedUsers
      },
      recentActivities
    };

    // Create CSV content
    const csvContent = `
SAJILO ADMIN REPORT
Generated: ${new Date().toLocaleString()}
Time Range: ${timeRange}

SUMMARY STATISTICS
==================
Total Users: ${totalUsers}
New Users (${timeRange}): ${newUsers}
Total Tasks: ${totalTasks}
Active Tasks: ${activeTasks}
Completed Tasks (${timeRange}): ${completedTasks}
Revenue (${timeRange}): NPR ${(totalRevenue._sum.budget || 0).toLocaleString()}
Pending KYC: ${pendingKYC}
Verified Users: ${verifiedUsers}

RECENT USER ACTIVITIES
======================
Name,Email,Role,Status,Joined Date
${recentActivities.map(u => `${u.name || 'N/A'},${u.email},${u.role},${u.verificationStatus},${u.createdAt.toLocaleDateString()}`).join('\n')}
`.trim();

    // Return as downloadable file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="admin-report-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
