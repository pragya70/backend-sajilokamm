import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status") || "PENDING_APPROVAL";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const skip = (page - 1) * limit;

    // Build where clause based on status
    let where: any = {};
    
    if (status === "PENDING_APPROVAL") {
      where.status = "PENDING_APPROVAL";
    } else if (status === "APPROVED") {
      where.status = { notIn: ["PENDING_APPROVAL", "REJECTED"] };
    } else if (status === "REJECTED") {
      where.status = "REJECTED";
    }

    // Add date filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of day
        where.createdAt.lte = end;
      }
    }

    // Fetch tasks with pagination
    const [tasks, totalCount] = await Promise.all([
      prisma.task.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          budget: true,
          status: true,
          category: true,
          expiresAt: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              verificationStatus: true
            }
          }
        }
      }),
      prisma.task.count({ where })
    ]);

    return NextResponse.json({
      tasks,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    });

  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
