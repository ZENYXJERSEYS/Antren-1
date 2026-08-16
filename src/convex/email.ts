"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { Resend } from "resend";

/**
 * Sends a verification code email. Runs in Node so it can use process.env —
 * set RESEND_API_KEY in the project's Keys/API keys tab. Optionally set
 * RESEND_FROM to a verified sender (defaults to Resend's onboarding sender,
 * which works for testing and delivers to the account owner's inbox).
 */
export const sendOtp = action({
  args: {
    to: v.string(),
    code: v.string(),
  },
  handler: async (_ctx, { to, code }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is not configured. Add it in the project's Keys tab to enable email login.",
      );
    }

    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM ?? "Antren <onboarding@resend.dev>";
    const appName = process.env.VLY_APP_NAME || "Antren";

    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: `Your ${appName} verification code`,
      text: `Your ${appName} verification code is ${code}. It expires in 15 minutes.`,
      html: `
        <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: #FAF8F5; padding: 32px 16px;">
          <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e0d8; border-radius: 12px; padding: 32px;">
            <p style="margin: 0 0 8px; color: #10B981; font-weight: 600; letter-spacing: 0.02em;">ANT REN</p>
            <h1 style="margin: 0 0 12px; font-size: 20px; color: #1C1614;">Your verification code</h1>
            <p style="margin: 0 0 24px; color: #6b645d; font-size: 14px; line-height: 1.6;">
              Enter this code on the ${appName} sign-in page. It expires in 15 minutes.
            </p>
            <div style="background: #F3EFEA; border-radius: 8px; padding: 20px; text-align: center; font-size: 28px; font-weight: 700; letter-spacing: 0.35em; color: #1C1614;">${code}</div>
            <p style="margin: 24px 0 0; color: #9a938b; font-size: 12px; line-height: 1.6;">
              If you didn't request this code, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      throw new Error(`Failed to send verification email: ${error.message}`);
    }

    return data?.id ?? null;
  },
});
