import { prisma } from "./prisma.js";

/**
 * Create a notification for a user
 */
export async function createNotification({ userId, type, title, message, data }) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
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
export async function createAdminNotification({ type, title, message, data }) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    const notifications = await Promise.all(
      admins.map((admin) =>
        createNotification({ userId: admin.id, type, title, message, data })
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
  kycSubmitted: (userName, userId) => ({
    type: "KYC_SUBMITTED",
    title: "New KYC Submission",
    message: `${userName} has submitted KYC documents for verification`,
    data: { userId },
  }),

  taskPosted: (posterName, taskTitle, taskId, budget, category) => ({
    type: "TASK_POSTED",
    title: "New Task Posted",
    message: `${posterName} posted "${taskTitle}" - ₹${budget.toLocaleString()}${category ? ` in ${category}` : ""}`,
    data: { taskId, posterName, budget, category },
  }),

  taskFlagged: (taskTitle, taskId) => ({
    type: "TASK_FLAGGED",
    title: "Task Flagged",
    message: `Task "${taskTitle}" has been flagged for review`,
    data: { taskId },
  }),

  userReported: (reportedUser, reporterId) => ({
    type: "USER_REPORTED",
    title: "User Reported",
    message: `User ${reportedUser} has been reported`,
    data: { reportedUser, reporterId },
  }),

  disputeOpened: (taskTitle, taskId) => ({
    type: "DISPUTE_OPENED",
    title: "New Dispute",
    message: `A dispute has been opened for task "${taskTitle}"`,
    data: { taskId },
  }),

  offerReceived: (taskerName, taskTitle, offerId, taskId) => ({
    type: "OFFER_RECEIVED",
    title: "New Offer Received",
    message: `${taskerName} sent you an offer for "${taskTitle}"`,
    data: { offerId, taskId },
  }),

  taskCompleted: (taskTitle, taskId) => ({
    type: "TASK_COMPLETED",
    title: "Task Completed",
    message: `Your task "${taskTitle}" has been marked as completed`,
    data: { taskId },
  }),

  taskStarted: (taskerName, taskTitle, taskId) => ({
    type: "TASK_STARTED",
    title: "Task Started",
    message: `${taskerName} has started working on "${taskTitle}"`,
    data: { taskId },
  }),

  reviewReceived: (reviewerName, rating, taskId) => ({
    type: "REVIEW_RECEIVED",
    title: "New Review",
    message: `${reviewerName} left you a ${rating}-star review`,
    data: { taskId, rating },
  }),

  taskAssigned: (taskTitle, taskId) => ({
    type: "TASK_ASSIGNED",
    title: "Task Assigned",
    message: `You've been assigned to work on "${taskTitle}"`,
    data: { taskId },
  }),

  paymentReleased: (amount, taskTitle, taskId) => ({
    type: "PAYMENT_RELEASED",
    title: "Payment Released",
    message: `Payment of ₹${amount} has been released for "${taskTitle}"`,
    data: { taskId, amount },
  }),

  taskDeadline: (taskTitle, taskId, hoursLeft) => ({
    type: "TASK_DEADLINE",
    title: "Task Deadline Approaching",
    message: `"${taskTitle}" is due in ${hoursLeft} hours`,
    data: { taskId, hoursLeft },
  }),

  profileViewed: (viewerName, viewerId) => ({
    type: "PROFILE_VIEWED",
    title: "Profile Viewed",
    message: `${viewerName} viewed your profile`,
    data: { viewerId },
  }),
};
