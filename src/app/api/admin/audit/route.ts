import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get recent activities
    const [recentUsers, recentOffers, flaggedTasks] = await Promise.all([
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          verificationStatus: true
        }
      }),
      prisma.offer.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true } },
          task: { select: { id: true, title: true } }
        }
      }),
      prisma.task.findMany({
        take: 5,
        where: { status: 'PENDING_APPROVAL' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          createdAt: true,
          status: true
        }
      })
    ]);

    // Format audit trail
    const auditTrail = [
      ...recentUsers.map(user => ({
        id: user.id,
        type: 'User Registration',
        user: user.name || user.email,
        timestamp: user.createdAt,
        status: user.verificationStatus === 'VERIFIED' ? 'VERIFIED' : 'PENDING',
        action: 'view'
      })),
      ...recentOffers.map(offer => ({
        id: offer.id,
        type: 'Payout Requested',
        user: `${offer.user.name} (TR-${offer.task.id.slice(0, 3)})`,
        timestamp: offer.createdAt,
        status: 'PENDING',
        action: 'review'
      })),
      ...flaggedTasks.map(task => ({
        id: task.id,
        type: 'Flagged Content',
        user: `Task ID: #${task.id.slice(0, 4)}`,
        timestamp: task.createdAt,
        status: 'CRITICAL',
        action: 'review'
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

    return NextResponse.json({ auditTrail });
  } catch (error) {
    console.error("Error fetching audit trail:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
