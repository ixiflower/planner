import "dotenv/config";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const fromName = process.env.SMTP_FROM_NAME || "Planner App";
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@planner.app";

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject: "Your Email Verification Code",
    text: `Welcome to Planner!\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not sign up for Planner, please ignore this email.`,
    html: `<div style="font-family: Arial; max-width: 480px; margin: 0 auto;">
      <h2>Welcome to Planner! 🎉</h2>
      <p>Your verification code is:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px; background: #f0f0f0; border-radius: 8px; margin: 16px 0;">
        ${otp}
      </div>
      <p style="color: #666;">This code expires in <strong>10 minutes</strong>.</p>
      <hr style="border: none; border-top: 1px solid #eee;" />
      <p style="color: #999; font-size: 12px;">If you did not sign up for Planner, please ignore this email.</p>
    </div>`,
  });
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
