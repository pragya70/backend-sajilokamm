import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, status } = await req.json();

    // Build where clause
    const where: any = {};
    
    if (role && role !== "All Roles") {
      where.role = role;
    }
    
    if (status && status !== "All Status") {
      where.verificationStatus = status;
    }

    // Fetch all users matching filters
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        verificationStatus: true,
        createdAt: true,
        rating: true,
        reviewCount: true
      }
    });

    // Generate CSV content
    const csvContent = `
SAJILO USER MANAGEMENT REPORT
Generated: ${new Date().toLocaleString()}
Filters: Role=${role || 'All'}, Status=${status || 'All'}
Total Users: ${users.length}

ID,Name,Email,Phone,Role,Status,Rating,Reviews,Joined Date
${users.map(u => 
  `${u.id},${u.name || 'N/A'},${u.email},${u.phoneNumber || 'N/A'},${u.role},${u.verificationStatus},${u.rating},${u.reviewCount},${new Date(u.createdAt).toLocaleDateString()}`
).join('\n')}
`.trim();

    // Return as downloadable file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="users-report-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error("Error exporting users:", error);
    return NextResponse.json({ error: "Failed to export users" }, { status: 500 });
  }
}
