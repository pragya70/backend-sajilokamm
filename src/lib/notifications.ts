import { prisma } from "./prisma";

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
}

/**
 * Create a notification for a user
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  data,
}: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: type as any,
        title,
        message,
        data: data || {},
        read: false,
      },
    });

    // Send real-time notification via Socket.IO
    try {
      if (global.io) {
        global.io.to(`user-${userId}`).emit("new-notification", notification);
        console.log(`📨 Notification sent to user ${userId} via Socket.IO`);
      }
    } catch (socketError) {
      console.error("Socket.IO emit error:", socketError);
    }

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}

/**
 * Create admin notification (sent to all admins)
 */
export async function createAdminNotification({
  type,
  title,
  message,
  data,
}: Omit<CreateNotificationParams, "userId">) {
  try {
    // Get all admin users
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    // Create notification for each admin
    const notifications = await Promise.all(
      admins.map((admin) =>
        createNotification({
          userId: admin.id,
          type,
          title,
          message,
          data,
        })
      )
    );

    return notifications;
  } catch (error) {
    console.error("Failed to create admin notifications:", error);
    return [];
  }
}

/**
 * Notification templates for common events
 */
export const NotificationTemplates = {
  // Admin notifications
  kycSubmitted: (userName: string, userId: string) => ({
    type: "KYC_SUBMITTED",
    title: "New KYC Submission",
    message: `${userName} has submitted KYC documents for verification`,
    data: { userId },
  }),

  taskPosted: (posterName: string, taskTitle: string, taskId: string, budget: number, category?: string) => ({
    type: "TASK_POSTED",
    title: "New Task Posted",
    message: `${posterName} posted "${taskTitle}" - ₹${budget.toLocaleString()}${category ? ` in ${category}` : ""}`,
    data: { taskId, posterName, budget, category },
  }),

  taskFlagged: (taskTitle: string, taskId: string) => ({
    type: "TASK_FLAGGED",
    title: "Task Flagged",
    message: `Task "${taskTitle}" has been flagged for review`,
    data: { taskId },
  }),

  userReported: (reportedUser: string, reporterId: string) => ({
    type: "USER_REPORTED",
    title: "User Reported",
    message: `User ${reportedUser} has been reported`,
    data: { reportedUser, reporterId },
  }),

  disputeOpened: (taskTitle: string, taskId: string) => ({
    type: "DISPUTE_OPENED",
    title: "New Dispute",
    message: `A dispute has been opened for task "${taskTitle}"`,
    data: { taskId },
  }),

  // Poster notifications
  offerReceived: (taskerName: string, taskTitle: string, offerId: string, taskId: string) => ({
    type: "OFFER_RECEIVED",
    title: "New Offer Received",
    message: `${taskerName} sent you an offer for "${taskTitle}"`,
    data: { offerId, taskId },
  }),

  taskCompleted: (taskTitle: string, taskId: string) => ({
    type: "TASK_COMPLETED",
    title: "Task Completed",
    message: `Your task "${taskTitle}" has been marked as completed`,
    data: { taskId },
  }),

  taskStarted: (taskerName: string, taskTitle: string, taskId: string) => ({
    type: "TASK_STARTED",
    title: "Task Started",
    message: `${taskerName} has started working on "${taskTitle}"`,
    data: { taskId },
  }),

  reviewReceived: (reviewerName: string, rating: number, taskId: string) => ({
    type: "REVIEW_RECEIVED",
    title: "New Review",
    message: `${reviewerName} left you a ${rating}-star review`,
    data: { taskId, rating },
  }),

  // Tasker notifications
  taskAssigned: (taskTitle: string, taskId: string) => ({
    type: "TASK_ASSIGNED",
    title: "Task Assigned",
    message: `You've been assigned to work on "${taskTitle}"`,
    data: { taskId },
  }),

  paymentReleased: (amount: number, taskTitle: string, taskId: string) => ({
    type: "PAYMENT_RELEASED",
    title: "Payment Released",
    message: `Payment of ₹${amount} has been released for "${taskTitle}"`,
    data: { taskId, amount },
  }),

  taskDeadline: (taskTitle: string, taskId: string, hoursLeft: number) => ({
    type: "TASK_DEADLINE",
    title: "Task Deadline Approaching",
    message: `"${taskTitle}" is due in ${hoursLeft} hours`,
    data: { taskId, hoursLeft },
  }),

  profileViewed: (viewerName: string, viewerId: string) => ({
    type: "PROFILE_VIEWED",
    title: "Profile Viewed",
    message: `${viewerName} viewed your profile`,
    data: { viewerId },
  }),
};
