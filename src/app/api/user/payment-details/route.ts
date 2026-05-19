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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        khaltiPhone: true,
        khaltiAccountName: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountName: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching payment details:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment details" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();

    const {
      khaltiPhone,
      khaltiAccountName,
      bankName,
      bankAccountNumber,
      bankAccountName,
    } = body;

    // Validate at least one payment method is provided
    if (!khaltiPhone && !bankAccountNumber) {
      return NextResponse.json(
        { error: "Please provide either Khalti phone number or bank account details" },
        { status: 400 }
      );
    }

    // Validate Khalti phone format (Nepal: 10 digits starting with 98)
    if (khaltiPhone && !/^98\d{8}$/.test(khaltiPhone)) {
      return NextResponse.json(
        { error: "Invalid Khalti phone number. Must be 10 digits starting with 98" },
        { status: 400 }
      );
    }

    // Update user payment details
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        khaltiPhone: khaltiPhone || null,
        khaltiAccountName: khaltiAccountName || null,
        bankName: bankName || null,
        bankAccountNumber: bankAccountNumber || null,
        bankAccountName: bankAccountName || null,
      },
      select: {
        khaltiPhone: true,
        khaltiAccountName: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountName: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment details updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating payment details:", error);
    return NextResponse.json(
      { error: "Failed to update payment details" },
      { status: 500 }
    );
  }
}
