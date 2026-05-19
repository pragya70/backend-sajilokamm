import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * DEVELOPMENT ONLY: Create test data for Khalti integration testing
 * DELETE THIS FILE IN PRODUCTION!
 */
export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    console.log('🚀 Creating test data...');

    // 1. Create Poster
    const posterPassword = await bcrypt.hash('Test123!', 10);
    const poster = await prisma.user.upsert({
      where: { email: 'poster@test.com' },
      update: {
        verificationStatus: 'VERIFIED',
        isPhoneVerified: true,
      },
      create: {
        email: 'poster@test.com',
        name: 'Test Poster',
        passwordHash: posterPassword,
        role: 'POSTER',
        verificationStatus: 'VERIFIED',
        isPhoneVerified: true,
        phoneNumber: '9841234567',
      },
    });

    // 2. Create Tasker with Khalti
    const taskerPassword = await bcrypt.hash('Test123!', 10);
    const tasker = await prisma.user.upsert({
      where: { email: 'tasker@test.com' },
      update: {
        verificationStatus: 'VERIFIED',
        isPhoneVerified: true,
        khaltiPhone: '9812345678',
        khaltiAccountName: 'Test Tasker',
      },
      create: {
        email: 'tasker@test.com',
        name: 'Test Tasker',
        passwordHash: taskerPassword,
        role: 'TASKER',
        verificationStatus: 'VERIFIED',
        isPhoneVerified: true,
        phoneNumber: '9851234567',
        khaltiPhone: '9812345678',
        khaltiAccountName: 'Test Tasker',
      },
    });

    // 3. Create Task
    const task = await prisma.task.create({
      data: {
        title: 'Test Khalti Payment Integration',
        description: 'This is a test task to verify the Khalti payment integration works correctly.',
        budget: 1000,
        location: 'Kathmandu, Nepal',
        latitude: 27.7172,
        longitude: 85.3240,
        status: 'IN_PROGRESS',
        category: 'Testing',
        userId: poster.id,
        validityPeriod: '1m',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // 4. Create Accepted Offer
    const offer = await prisma.offer.create({
      data: {
        taskId: task.id,
        userId: tasker.id,
        price: 950,
        message: 'I can complete this task!',
        status: 'ACCEPTED',
      },
    });

    // 5. Calculate fees
    const amount = offer.price;
    const platformFee = amount * 0.05;
    const taskerPayout = amount - platformFee;

    // 6. Create PENDING Transaction
    const transaction = await prisma.transaction.create({
      data: {
        taskId: task.id,
        posterId: poster.id,
        taskerId: tasker.id,
        amount: amount,
        platformFee: platformFee,
        taskerPayout: taskerPayout,
        status: 'PENDING',
        method: 'KHALTI',
        proofImages: ['https://via.placeholder.com/400'],
        completionNotes: 'Task completed!',
        submittedAt: new Date(),
      },
    });

    // 7. Update task
    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: 'COMPLETED',
        completionApprovedByTasker: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Test data created successfully!',
      data: {
        poster: {
          email: 'poster@test.com',
          password: 'Test123!',
          id: poster.id,
        },
        tasker: {
          email: 'tasker@test.com',
          password: 'Test123!',
          id: tasker.id,
          khaltiPhone: '9812345678',
        },
        task: {
          id: task.id,
          title: task.title,
        },
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          taskerPayout: transaction.taskerPayout,
          status: transaction.status,
        },
        testInstructions: {
          step1: 'Login as poster: poster@test.com / Test123!',
          step2: 'Go to /dashboard/transactions',
          step3: 'Click "Release Payment"',
          step4: 'Choose "Pay via Khalti"',
          step5: 'Use Khalti test credentials: Phone: 9800000001, OTP: 987654, PIN: 1111',
        },
      },
    });
  } catch (error) {
    console.error('Error creating test data:', error);
    return NextResponse.json(
      {
        error: 'Failed to create test data',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
