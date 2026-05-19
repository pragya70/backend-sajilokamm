import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(email: string, token: string) {
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

  try {
    if (!process.env.EMAIL_SERVER_USER) {
      console.log("======================================");
      console.log(`[MOCK EMAIL] Sent to: ${email}`);
      console.log(`[MOCK EMAIL] Subject: ${mailOptions.subject}`);
      console.log(`[MOCK EMAIL] Token Code: ${token}`);
      console.log("======================================");
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send reset email");
  }
}

// Helper to create transporter
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });
};

export async function sendModerationAlert(taskTitle: string, posterName: string) {
  const adminEmail = "admin@tasker.com";
  const mailOptions = {
    from: '"Tasker Moderation" <support@tasker.com>',
    to: adminEmail,
    subject: "⚠️ New Task Awaiting Review",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #FF7F00;">New Task Submission</h2>
        <p>A new task has been posted and is awaiting your approval.</p>
        <div style="background: #fff8e1; padding: 15px; border-left: 5px solid #FF7F00; margin: 20px 0;">
          <p><strong>Title:</strong> ${taskTitle}</p>
          <p><strong>Posted By:</strong> ${posterName}</p>
        </div>
        <p>Please log in to the Admin Dashboard to review and approve this post.</p>
        <a href="${process.env.NEXTAUTH_URL}/admin/tasks" style="display: inline-block; background: #0A65FC; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Review Tasks</a>
      </div>
    `,
  };

  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] Moderation alert for "${taskTitle}" loggged.`);
    return;
  }
  await getTransporter().sendMail(mailOptions);
}

export async function sendTaskStatusUpdate(email: string, taskTitle: string, status: "OPEN" | "REJECTED") {
  const isApproved = status === "OPEN";
  const mailOptions = {
    from: '"Tasker Support" <support@tasker.com>',
    to: email,
    subject: isApproved ? "✅ Your Task has been Approved!" : "❌ Task Submission Update",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: ${isApproved ? "#20BF6F" : "#EF4444"};">Task Update</h2>
        <p>Hello,</p>
        <p>Your task <strong>"${taskTitle}"</strong> has been ${isApproved ? "approved and is now live on the marketplace!" : "reviewed and unfortunately could not be approved at this time."}</p>
        
        ${isApproved ? `
          <p>Taskers can now see your post and start placing offers.</p>
          <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; background: #20BF6F; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">View My Dashboard</a>
        ` : `
          <p>If you have questions, please reach out to our support team.</p>
        `}
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  };

  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] Task status update for "${taskTitle}" (${status}) logged to ${email}.`);
    return;
  }
  await getTransporter().sendMail(mailOptions);
}

export async function sendKYCModerationAlert(userName: string) {
  const adminEmail = "admin@tasker.com";
  const mailOptions = {
    from: '"Tasker Moderation" <support@tasker.com>',
    to: adminEmail,
    subject: "🛡️ New KYC Submission for Review",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0A65FC;">KYC Verification Required</h2>
        <p>A user has submitted their identity documents for verification.</p>
        <div style="background: #f0f7ff; padding: 15px; border-left: 5px solid #0A65FC; margin: 20px 0;">
          <p><strong>User:</strong> ${userName}</p>
        </div>
        <p>Please log in to the Admin KYC Portal to review the documents.</p>
        <a href="${process.env.NEXTAUTH_URL}/admin/kyc" style="display: inline-block; background: #0A65FC; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Review Documents</a>
      </div>
    `,
  };

  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] KYC Moderation alert for "${userName}" logged.`);
    return;
  }
  await getTransporter().sendMail(mailOptions);
}

export async function sendKYCStatusUpdate(email: string, status: "VERIFIED" | "REJECTED") {
  const isVerified = status === "VERIFIED";
  const mailOptions = {
    from: '"Tasker Support" <support@tasker.com>',
    to: email,
    subject: isVerified ? "🎯 You are now a Verified Professional!" : "⚠️ KYC Verification Update",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: ${isVerified ? "#20BF6F" : "#EF4444"};">Verification Result</h2>
        <p>Hello,</p>
        <p>Your identity verification request has been ${isVerified ? "approved! A 'Verified' badge has been added to your profile." : "reviewed and unfortunately could not be approved at this time."}</p>
        
        ${isVerified ? `
          <p>Being verified helps build trust and increases your chances of winning tasks.</p>
          <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; background: #20BF6F; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
        ` : `
          <p>Please log in to your dashboard to re-submit your documents if you believe this was an error.</p>
        `}
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  };

  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] KYC Status Update for ${email}: ${status}`);
    return;
  }
  await getTransporter().sendMail(mailOptions);
}

export async function sendKYCReuploadRequest(email: string, name: string) {
  const mailOptions = {
    from: '"Tasker Support" <support@tasker.com>',
    to: email,
    subject: "📄 KYC Document Re-upload Required",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0A65FC;">KYC Document Re-upload Required</h2>
        <p>Hello ${name},</p>
        <p>Our verification team has reviewed your KYC documents and requires you to re-upload them.</p>
        
        <p><strong>What you need to do:</strong></p>
        <ul>
          <li>Log in to your account</li>
          <li>Go to your profile settings</li>
          <li>Upload clear, valid identity documents</li>
          <li>Ensure all information is legible and matches your profile</li>
        </ul>
        
        <p>Please ensure your documents meet the following requirements:</p>
        <ul>
          <li>Clear, high-quality images</li>
          <li>All text is readable</li>
          <li>Documents are valid and not expired</li>
          <li>Selfie clearly shows your face</li>
        </ul>
        
        <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; background: #0A65FC; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px;">Upload Documents</a>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  };

  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] KYC Re-upload Request for ${email}`);
    return;
  }
  await getTransporter().sendMail(mailOptions);
}

export async function sendCompletionApprovalAlert(email: string, taskTitle: string, approvedBy: "Poster" | "Tasker") {
  const mailOptions = {
    from: '"Tasker Support" <support@tasker.com>',
    to: email,
    subject: `🕒 Status Update: ${approvedBy} approved completion of "${taskTitle}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0A65FC;">Task Completion Update</h2>
        <p>Hello,</p>
        <p>The <strong>${approvedBy}</strong> has marked your task <strong>"${taskTitle}"</strong> as completed.</p>
        
        <p>To finalize the task and release the payment, please log in and confirm the completion from your dashboard.</p>
        
        <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; background: #0A65FC; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Review Completion</a>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  };

  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] Completion approval alert sent to ${email} for "${taskTitle}" by ${approvedBy}.`);
    return;
  }
  await getTransporter().sendMail(mailOptions);
}

export async function sendFinalCompletionNotice(posterEmail: string, taskerEmail: string, taskTitle: string, amount: number) {
  const commonHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #20BF6F;">🎉 Task Officially Completed!</h2>
      <p>Great news! The task <strong>"${taskTitle}"</strong> has been approved by both parties and is now officially closed.</p>
      
      <div style="background: #f0fff4; padding: 15px; border-left: 5px solid #20BF6F; margin: 20px 0;">
        <p><strong>Total Amount:</strong> Rs. ${amount}</p>
        <p><strong>Status:</strong> Funds Released</p>
      </div>
      
      <p>Please take a moment to leave a review for the other party to help build their reputation in the marketplace.</p>
      
      <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; background: #0A65FC; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Leave a Review</a>
      
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply.</p>
    </div>
  `;

  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] Final completion notice for "${taskTitle}" logged for both ${posterEmail} and ${taskerEmail}.`);
    return;
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: '"Tasker Payments" <payments@tasker.com>',
    to: posterEmail,
    subject: `✅ Task Completed: "${taskTitle}"`,
    html: commonHtml
  });

  await transporter.sendMail({
    from: '"Tasker Payments" <payments@tasker.com>',
    to: taskerEmail,
    subject: `💰 Payment Released: "${taskTitle}"`,
    html: commonHtml
  });
}
export async function sendExpiryReminderEmail(
  posterEmail: string,
  posterName: string,
  taskTitle: string,
  expiresAt: Date,
  daysLeft: number,
) {
  const expireDate = expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const urgencyColor = daysLeft <= 1 ? "#EF4444" : daysLeft <= 2 ? "#FF7F00" : "#0A65FC";
  const urgencyLabel = daysLeft === 0 ? "🚨 EXPIRING TODAY" : daysLeft <= 1 ? "⚠️ EXPIRING TOMORROW" : `⏰ ${daysLeft} Days Left`;
  const headingText = daysLeft === 0 ? "Post Expiring Within 24 Hours!" : daysLeft <= 1 ? "Post Expiring Tomorrow" : `Post Expiring in ${daysLeft} Days`;

  const mailOptions = {
    from: '"Easy Tasker" <support@easytasker.com>',
    to: posterEmail,
    subject: `${urgencyLabel}: Your post "${taskTitle}" is about to expire`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; padding: 0; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
        <!-- Header -->
        <div style="background: ${urgencyColor}; padding: 32px 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">
            ${daysLeft === 0 ? "🚨" : daysLeft <= 1 ? "⚠️" : "⏰"} ${headingText}
          </h1>
        </div>

        <!-- Body -->
        <div style="padding: 40px; background: #ffffff;">
          <p style="color: #374151; margin: 0 0 16px;">Hi <strong>${posterName}</strong>,</p>
          <p style="color: #374151; margin: 0 0 24px;">
            Your task post is about to expire and will automatically be removed from the marketplace.
          </p>

          <!-- Task Card -->
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-left: 5px solid ${urgencyColor}; border-radius: 12px; padding: 20px 24px; margin: 0 0 24px;">
            <p style="margin: 0 0 8px; color: #6b7280; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Task Post</p>
            <p style="margin: 0 0 12px; font-size: 18px; font-weight: 900; color: #111827;">${taskTitle}</p>
            <p style="margin: 0; color: #6b7280; font-size: 13px;">
              <strong style="color: ${urgencyColor};">Expires:</strong> ${expireDate}
            </p>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin: 0 0 28px;">
            Once expired, Taskers will no longer be able to see or bid on your post.
            You can contact an admin to regenerate the post, or create a new one from your dashboard.
          </p>

          <a href="${process.env.NEXTAUTH_URL}/dashboard"
             style="display: inline-block; background: ${urgencyColor}; color: white; padding: 14px 32px;
                    text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px;">
            Go to My Dashboard →
          </a>
        </div>

        <!-- Footer -->
        <div style="padding: 24px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
            This is an automated reminder from Easy Tasker. Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
  };

  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] Expiry reminder for "${taskTitle}" → ${posterEmail} (${daysLeft}d left)`);
    return;
  }
  await getTransporter().sendMail(mailOptions);
}

export async function sendPaymentConfirmationEmail(
  posterEmail: string,
  posterName: string,
  taskerEmail: string,
  taskerName: string,
  taskTitle: string,
  amount: number,
  esewaRefId: string,
) {
  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] Payment confirmation for "${taskTitle}" — NPR ${amount} | Ref: ${esewaRefId}`);
    return;
  }

  const transporter = getTransporter();
  const base = process.env.NEXTAUTH_URL!;

  // Email to poster (payment sent)
  await transporter.sendMail({
    from: '"EasyTasker Payments" <payments@easytasker.com>',
    to: posterEmail,
    subject: `✅ Payment Sent — "${taskTitle}"`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:auto;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:linear-gradient(135deg,#0A65FC,#0756d6);padding:32px 40px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:22px;font-weight:900;">Payment Sent ✅</h1>
        </div>
        <div style="padding:40px;background:#fff;">
          <p style="color:#374151;margin:0 0 16px;">Hi <strong>${posterName}</strong>,</p>
          <p style="color:#374151;margin:0 0 24px;">Your payment for the task <strong>"${taskTitle}"</strong> has been successfully processed via eSewa.</p>
          <div style="background:#f0fff4;border:1px solid #bbf7d0;border-left:5px solid #20BF6F;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
            <p style="margin:0 0 8px;color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Transaction Details</p>
            <p style="margin:0 0 6px;font-size:16px;font-weight:900;color:#111827;">NPR ${amount.toLocaleString()}</p>
            <p style="margin:0 0 4px;color:#6b7280;font-size:13px;"><strong>Paid to:</strong> ${taskerName}</p>
            <p style="margin:0;color:#6b7280;font-size:13px;"><strong>eSewa Ref:</strong> <span style="font-family:monospace;">${esewaRefId}</span></p>
          </div>
          <a href="${base}/transactions" style="display:inline-block;background:#0A65FC;color:white;padding:14px 32px;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">View Transactions</a>
        </div>
        <div style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">This is an automated message from EasyTasker. Please do not reply.</p>
        </div>
      </div>
    `,
  });

  // Email to tasker (payment received)
  await transporter.sendMail({
    from: '"EasyTasker Payments" <payments@easytasker.com>',
    to: taskerEmail,
    subject: `💰 Payment Received — "${taskTitle}"`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:auto;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:linear-gradient(135deg,#20BF6F,#16a34a);padding:32px 40px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:22px;font-weight:900;">Payment Received 💰</h1>
        </div>
        <div style="padding:40px;background:#fff;">
          <p style="color:#374151;margin:0 0 16px;">Hi <strong>${taskerName}</strong>,</p>
          <p style="color:#374151;margin:0 0 24px;">Great news! You have received payment for completing the task <strong>"${taskTitle}"</strong>.</p>
          <div style="background:#f0fff4;border:1px solid #bbf7d0;border-left:5px solid #20BF6F;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
            <p style="margin:0 0 8px;color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Payment Details</p>
            <p style="margin:0 0 6px;font-size:16px;font-weight:900;color:#111827;">NPR ${amount.toLocaleString()}</p>
            <p style="margin:0 0 4px;color:#6b7280;font-size:13px;"><strong>From:</strong> ${posterName}</p>
            <p style="margin:0;color:#6b7280;font-size:13px;"><strong>eSewa Ref:</strong> <span style="font-family:monospace;">${esewaRefId}</span></p>
          </div>
          <a href="${base}/transactions" style="display:inline-block;background:#20BF6F;color:white;padding:14px 32px;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">View Transactions</a>
        </div>
        <div style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">This is an automated message from EasyTasker. Please do not reply.</p>
        </div>
      </div>
    `,
  });
}

export async function sendTaskAlertEmail(
  email: string,
  name: string,
  taskTitle: string,
  category: string,
  budget: number,
  taskId: string,
) {
  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] Task alert to ${email}: "${taskTitle}" in ${category}`);
    return;
  }
  await getTransporter().sendMail({
    from: '"EasyTasker Alerts" <alerts@easytasker.com>',
    to: email,
    subject: `🔔 New Task in ${category}: "${taskTitle}"`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:auto;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:linear-gradient(135deg,#0A65FC,#0756d6);padding:28px 40px;">
          <h1 style="color:white;margin:0;font-size:20px;font-weight:900;">New Task Alert 🔔</h1>
        </div>
        <div style="padding:32px 40px;background:#fff;">
          <p style="color:#374151;margin:0 0 16px;">Hi <strong>${name}</strong>, a new task matching your skills was just posted!</p>
          <div style="background:#f0f7ff;border:1px solid #bfdbfe;border-left:5px solid #0A65FC;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
            <p style="margin:0 0 6px;font-size:17px;font-weight:900;color:#111827;">${taskTitle}</p>
            <p style="margin:0 0 4px;color:#6b7280;font-size:13px;"><strong>Category:</strong> ${category}</p>
            <p style="margin:0;color:#6b7280;font-size:13px;"><strong>Budget:</strong> NPR ${budget.toLocaleString()}</p>
          </div>
          <a href="${process.env.NEXTAUTH_URL}/tasks/${taskId}" style="display:inline-block;background:#0A65FC;color:white;padding:14px 32px;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">View & Bid Now →</a>
        </div>
        <div style="padding:16px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">EasyTasker · You're receiving this because it matches your skills.</p>
        </div>
      </div>
    `,
  });
}

export async function sendTaskCancelledEmail(
  email: string,
  name: string,
  taskTitle: string,
  reason: string,
  penalty: boolean,
) {
  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] Task cancelled: "${taskTitle}" → ${email}`);
    return;
  }
  await getTransporter().sendMail({
    from: '"EasyTasker" <support@easytasker.com>',
    to: email,
    subject: `Task Cancelled: "${taskTitle}"`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:auto;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:#EF4444;padding:28px 40px;">
          <h1 style="color:white;margin:0;font-size:20px;font-weight:900;">Task Cancelled ❌</h1>
        </div>
        <div style="padding:32px 40px;background:#fff;">
          <p>Hi <strong>${name}</strong>,</p>
          <p>The task <strong>"${taskTitle}"</strong> has been cancelled by the poster.</p>
          <p><strong>Reason:</strong> ${reason}</p>
          ${penalty ? `<p style="color:#EF4444;font-weight:600;">Note: This task was cancelled while in progress.</p>` : ""}
          <a href="${process.env.NEXTAUTH_URL}/tasks" style="display:inline-block;background:#0A65FC;color:white;padding:12px 28px;text-decoration:none;border-radius:10px;font-weight:700;">Browse More Tasks</a>
        </div>
      </div>
    `,
  });
}

export async function sendOfferRejectedEmail(
  email: string,
  name: string,
  taskTitle: string,
) {
  const mailOptions = {
    from: '"Sajilo Kaam" <support@sajilokaam.com>',
    to: email,
    subject: `Your offer on "${taskTitle}" was not selected`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:auto;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:linear-gradient(135deg,#0A65FC,#0756d6);padding:32px 40px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:22px;font-weight:900;">Thank You for Your Offer</h1>
        </div>
        <div style="padding:40px;background:#fff;">
          <p style="color:#374151;margin:0 0 16px;">Hi <strong>${name}</strong>,</p>
          <p style="color:#374151;margin:0 0 16px;">
            Thank you for submitting your offer on <strong>"${taskTitle}"</strong>.
            After careful consideration, the poster has chosen to move forward with another tasker for this task.
          </p>
          <div style="background:#f0f7ff;border:1px solid #bfdbfe;border-left:5px solid #0A65FC;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
            <p style="margin:0;color:#374151;font-size:14px;">
              Don't be discouraged — your skills are valued and we'd love to connect you with future opportunities.
              There are many more tasks waiting for talented professionals like you!
            </p>
          </div>
          <p style="color:#6b7280;font-size:14px;margin:0 0 28px;">
            Keep your profile updated and continue bidding on tasks that match your expertise.
            We look forward to seeing you succeed on your next opportunity.
          </p>
          <a href="${process.env.NEXTAUTH_URL}/tasks"
             style="display:inline-block;background:#0A65FC;color:white;padding:14px 32px;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">
            Browse More Tasks →
          </a>
        </div>
        <div style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            Sajilo Kaam · We can connect again in the future!
          </p>
        </div>
      </div>
    `,
  };

  if (!process.env.EMAIL_SERVER_USER) {
    console.log(`[MOCK EMAIL] Offer rejected notice to ${email} for "${taskTitle}"`);
    return;
  }
  await getTransporter().sendMail(mailOptions);
}
