import { getAuthUserId } from "@convex-dev/auth/server";
import { MutationCtx, QueryCtx } from "../_generated/server";

/** Resolve the signed-in user id, or null. */
export async function getUserId(ctx: QueryCtx | MutationCtx) {
  return await getAuthUserId(ctx);
}

/** Require a signed-in user; throw otherwise. */
export async function requireUserId(ctx: MutationCtx | QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Not authenticated");
  }
  return userId;
}

/** Require an admin user. */
export async function requireAdmin(ctx: MutationCtx | QueryCtx) {
  const userId = await requireUserId(ctx);
  const user = await ctx.db.get(userId);
  if (!user || user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return { userId, user };
}
