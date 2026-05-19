import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const { searchParams } = new URL(req.url);
    const roleParam = searchParams.get("role");

    // Use role from query param or session
    const role = roleParam || userRole;

    let transactions;

    if (role === "POSTER" || role === "ADMIN") {
      // Get transactions where user is the poster (paying)
      // Admins can see all transactions
      const where = role === "ADMIN" ? {} : { posterId: userId };
      
      transactions = await prisma.transaction.findMany({
        where,
        include: {
          task: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          tasker: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              verificationStatus: true,
            },
          },
          poster: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else if (role === "TASKER") {
      // Get transactions where user is the tasker (receiving)
      transactions = await prisma.transaction.findMany({
        where: {
          taskerId: userId,
        },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          poster: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          tasker: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      // If no valid role, return both poster and tasker transactions
      const [posterTransactions, taskerTransactions] = await Promise.all([
        prisma.transaction.findMany({
          where: { posterId: userId },
          include: {
            task: { select: { id: true, title: true, status: true } },
            tasker: { select: { id: true, name: true, email: true, image: true, verificationStatus: true } },
            poster: { select: { id: true, name: true, email: true } },
          },
        }),
        prisma.transaction.findMany({
          where: { taskerId: userId },
          include: {
            task: { select: { id: true, title: true, status: true } },
            poster: { select: { id: true, name: true, email: true, image: true } },
            tasker: { select: { id: true, name: true, email: true } },
          },
        }),
      ]);
      
      transactions = [...posterTransactions, ...taskerTransactions].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
