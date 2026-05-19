import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get transaction volume for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await prisma.task.groupBy({
      by: ['createdAt'],
      _count: true,
      _sum: { budget: true },
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Format data for chart (group by date)
    const dataPoints = transactions.map(t => ({
      date: t.createdAt.toISOString().split('T')[0],
      value: t._sum.budget || 0,
      count: t._count
    }));

    return NextResponse.json({ data: dataPoints });
  } catch (error) {
    console.error("Error fetching growth data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
