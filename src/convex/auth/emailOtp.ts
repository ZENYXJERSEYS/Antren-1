import { Email } from "@convex-dev/auth/providers/Email";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";
import { api } from "../_generated/api";

/**
 * The auth action passes its ctx as a second (runtime-only, untyped) argument
 * so providers can delegate work to other Convex functions.
 */
type SendVerificationCtx = {
  runAction: (name: any, args: any) => Promise<any>;
};

export const emailOtp = Email({
  id: "email-otp",
  maxAge: 60 * 15, // 15 minutes
  // This function can be asynchronous
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };
    const alphabet = "0123456789";
    return generateRandomString(random, alphabet, 6);
  },
  async sendVerificationRequest(
    { identifier: email, token }: { identifier: string; token: string },
    ctx?: SendVerificationCtx,
  ) {
    // Delegate to a Node action so the email is sent with the Resend API key
    // from the project's env (set via the Keys/API keys tab) — never
    // hardcode secrets in source.
    await ctx?.runAction(api.email.sendOtp, { to: email, code: token });
  },
});
