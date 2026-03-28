/**
 * YigYaps Email Utility
 *
 * Sends transactional emails via Resend.
 * Falls back to logging in dev/test when RESEND_API_KEY is not set.
 *
 * License: Apache 2.0
 */

import { env } from "./env.js";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email. Uses Resend in production, logs in dev/test.
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!env.RESEND_API_KEY) {
    // Dev/test fallback: log instead of sending
    console.log(`[email:dev] To: ${payload.to} | Subject: ${payload.subject}`);
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(env.RESEND_API_KEY);

  await resend.emails.send({
    from: "YigYaps <noreply@yigyaps.com>",
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });
}

/**
 * Send email verification link.
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<void> {
  const baseUrl = env.FRONTEND_URL;
  const verifyUrl = `${baseUrl}/auth/verify-email?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Verify your YigYaps email",
    html: `
      <h2>Welcome to YigYaps!</h2>
      <p>Click below to verify your email address:</p>
      <p><a href="${verifyUrl}" style="padding:12px 24px;background:#6366f1;color:white;text-decoration:none;border-radius:6px;display:inline-block">Verify Email</a></p>
      <p>Or copy this link: ${verifyUrl}</p>
      <p>This link expires in 24 hours.</p>
      <p style="color:#6b7280;font-size:14px">If you didn't create a YigYaps account, ignore this email.</p>
    `,
  });
}

/**
 * Send password reset link.
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<void> {
  const baseUrl = env.FRONTEND_URL;
  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Reset your YigYaps password",
    html: `
      <h2>Password Reset</h2>
      <p>Click below to reset your password:</p>
      <p><a href="${resetUrl}" style="padding:12px 24px;background:#6366f1;color:white;text-decoration:none;border-radius:6px;display:inline-block">Reset Password</a></p>
      <p>Or copy this link: ${resetUrl}</p>
      <p>This link expires in 1 hour.</p>
      <p style="color:#6b7280;font-size:14px">If you didn't request this, ignore this email.</p>
    `,
  });
}
