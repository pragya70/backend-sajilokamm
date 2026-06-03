import nodemailer from "nodemailer";

const getTransporter = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

export async function sendPasswordResetEmail(email, token) {
  const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?email=${encodeURIComponent(email)}&token=${token}`;
  const mailOptions = {
    from: '"Tasker Support" <support@tasker.com>',
    to: email,
    subject: "Reset your Tasker password",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0A65FC;">Password Reset Request</h2>
        <p>You requested to reset your password for your Tasker account.</p>
        <p>Please use the following verification code to reset your password:</p>
        <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
          ${token}
        </div>
        <p>This code will expire in 1 hour. If you did not request this, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  };

  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] Reset token for ${email}: ${token}`);
    return;
  }
  await getTransporter().sendMail(mailOptions);
}

export async function sendModerationAlert(taskTitle, posterName) {
  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] Moderation alert for "${taskTitle}" by ${posterName}`);
    return;
  }
  await getTransporter().sendMail({
    from: '"Tasker Moderation" <support@tasker.com>',
    to: "admin@tasker.com",
    subject: "⚠️ New Task Awaiting Review",
    html: `<p>New task "<strong>${taskTitle}</strong>" posted by ${posterName} awaiting approval.</p>
           <a href="${process.env.NEXTAUTH_URL}/admin/tasks">Review Tasks</a>`,
  });
}

export async function sendTaskStatusUpdate(email, taskTitle, status) {
  const isApproved = status === "OPEN";
  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] Task status update for "${taskTitle}" (${status}) to ${email}`);
    return;
  }
  await getTransporter().sendMail({
    from: '"Tasker Support" <support@tasker.com>',
    to: email,
    subject: isApproved ? "✅ Your Task has been Approved!" : "❌ Task Submission Update",
    html: `<p>Your task <strong>"${taskTitle}"</strong> has been ${isApproved ? "approved and is now live!" : "reviewed and could not be approved at this time."}</p>`,
  });
}

export async function sendKYCModerationAlert(userName) {
  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] KYC Moderation alert for "${userName}"`);
    return;
  }
  await getTransporter().sendMail({
    from: '"Tasker Moderation" <support@tasker.com>',
    to: "admin@tasker.com",
    subject: "🛡️ New KYC Submission for Review",
    html: `<p>User <strong>${userName}</strong> has submitted KYC documents.</p>
           <a href="${process.env.NEXTAUTH_URL}/admin/kyc">Review Documents</a>`,
  });
}

export async function sendKYCStatusUpdate(email, status) {
  const isVerified = status === "VERIFIED";
  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] KYC Status Update for ${email}: ${status}`);
    return;
  }
  await getTransporter().sendMail({
    from: '"Tasker Support" <support@tasker.com>',
    to: email,
    subject: isVerified ? "🎯 You are now a Verified Professional!" : "⚠️ KYC Verification Update",
    html: `<p>Your identity verification has been ${isVerified ? "approved!" : "reviewed and could not be approved at this time."}</p>`,
  });
}

export async function sendKYCReuploadRequest(email, name) {
  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] KYC Re-upload Request for ${email}`);
    return;
  }
  await getTransporter().sendMail({
    from: '"Tasker Support" <support@tasker.com>',
    to: email,
    subject: "📄 KYC Document Re-upload Required",
    html: `<p>Hi ${name}, please re-upload your KYC documents.</p>
           <a href="${process.env.NEXTAUTH_URL}/dashboard">Upload Documents</a>`,
  });
}

export async function sendCompletionApprovalAlert(email, taskTitle, approvedBy) {
  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] Completion approval alert to ${email} for "${taskTitle}" by ${approvedBy}`);
    return;
  }
  await getTransporter().sendMail({
    from: '"Tasker Support" <support@tasker.com>',
    to: email,
    subject: `🕒 ${approvedBy} approved completion of "${taskTitle}"`,
    html: `<p>The <strong>${approvedBy}</strong> has marked task <strong>"${taskTitle}"</strong> as completed. Please confirm from your dashboard.</p>
           <a href="${process.env.NEXTAUTH_URL}/dashboard">Review Completion</a>`,
  });
}

export async function sendFinalCompletionNotice(posterEmail, taskerEmail, taskTitle, amount) {
  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] Final completion notice for "${taskTitle}"`);
    return;
  }
  const transporter = getTransporter();
  const html = `<p>Task <strong>"${taskTitle}"</strong> has been completed and payment of Rs. ${amount} released.</p>`;
  await transporter.sendMail({ from: '"Tasker Payments" <payments@tasker.com>', to: posterEmail, subject: `✅ Task Completed: "${taskTitle}"`, html });
  await transporter.sendMail({ from: '"Tasker Payments" <payments@tasker.com>', to: taskerEmail, subject: `💰 Payment Released: "${taskTitle}"`, html });
}

export async function sendExpiryReminderEmail(posterEmail, posterName, taskTitle, expiresAt, daysLeft) {
  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] Expiry reminder for "${taskTitle}" → ${posterEmail} (${daysLeft}d left)`);
    return;
  }
  await getTransporter().sendMail({
    from: '"Easy Tasker" <support@easytasker.com>',
    to: posterEmail,
    subject: `⏰ Your post "${taskTitle}" expires in ${daysLeft} day(s)`,
    html: `<p>Hi ${posterName}, your task post <strong>"${taskTitle}"</strong> expires on ${expiresAt.toLocaleDateString()}.</p>
           <a href="${process.env.NEXTAUTH_URL}/dashboard">Go to Dashboard</a>`,
  });
}

export async function sendPaymentConfirmationEmail(posterEmail, posterName, taskerEmail, taskerName, taskTitle, amount, esewaRefId) {
  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] Payment confirmation for "${taskTitle}" — NPR ${amount}`);
    return;
  }
  const transporter = getTransporter();
  await transporter.sendMail({
    from: '"EasyTasker Payments" <payments@easytasker.com>',
    to: posterEmail,
    subject: `✅ Payment Sent — "${taskTitle}"`,
    html: `<p>Hi ${posterName}, your payment of NPR ${amount} for "${taskTitle}" was sent to ${taskerName}. Ref: ${esewaRefId}</p>`,
  });
  await transporter.sendMail({
    from: '"EasyTasker Payments" <payments@easytasker.com>',
    to: taskerEmail,
    subject: `💰 Payment Received — "${taskTitle}"`,
    html: `<p>Hi ${taskerName}, you received NPR ${amount} from ${posterName} for "${taskTitle}". Ref: ${esewaRefId}</p>`,
  });
}

export async function sendTaskAlertEmail(email, name, taskTitle, category, budget, taskId) {
  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] Task alert to ${email}: "${taskTitle}" in ${category}`);
    return;
  }
  await getTransporter().sendMail({
    from: '"EasyTasker Alerts" <alerts@easytasker.com>',
    to: email,
    subject: `🔔 New Task in ${category}: "${taskTitle}"`,
    html: `<p>Hi ${name}, a new task matching your skills was posted: <strong>${taskTitle}</strong> — NPR ${budget.toLocaleString()}</p>
           <a href="${process.env.NEXTAUTH_URL}/tasks/${taskId}">View & Bid Now</a>`,
  });
}

export async function sendTaskCancelledEmail(email, name, taskTitle, reason, penalty) {
  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] Task cancelled: "${taskTitle}" → ${email}`);
    return;
  }
  await getTransporter().sendMail({
    from: '"EasyTasker" <support@easytasker.com>',
    to: email,
    subject: `Task Cancelled: "${taskTitle}"`,
    html: `<p>Hi ${name}, task <strong>"${taskTitle}"</strong> has been cancelled. Reason: ${reason}${penalty ? " (cancelled while in progress)" : ""}</p>`,
  });
}

export async function sendOfferRejectedEmail(email, name, taskTitle) {
  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] Offer rejected notice to ${email} for "${taskTitle}"`);
    return;
  }
  await getTransporter().sendMail({
    from: '"Sajilo Kaam" <support@sajilokaam.com>',
    to: email,
    subject: `Your offer on "${taskTitle}" was not selected`,
    html: `<p>Hi ${name}, thank you for your offer on "${taskTitle}". The poster has chosen another tasker. Keep bidding!</p>
           <a href="${process.env.NEXTAUTH_URL}/tasks">Browse More Tasks</a>`,
  });
}

export async function sendOfferNotificationEmail(email, name, taskTitle, taskerName, price, message, taskId) {
  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] Offer notification to ${email} for "${taskTitle}"`);
    return;
  }
  await getTransporter().sendMail({
    from: '"Tasker" <support@tasker.com>',
    to: email,
    subject: `New Offer on "${taskTitle}"`,
    html: `<p>Hi ${name}, ${taskerName} made an offer of Rs. ${price.toLocaleString()} on your task "${taskTitle}".</p>
           <p>Message: ${message}</p>
           <a href="${process.env.NEXTAUTH_URL}/tasks/${taskId}">View Offer</a>`,
  });
}
