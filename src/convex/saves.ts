import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";

/** All opportunity ids saved by the current user (for card badges). */
export const savedIds = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("savedOpportunities")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.map((r) => r.opportunityId);
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("savedOpportunities")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    const items = await Promise.all(
      rows.map(async (row) => {
        const opp = await ctx.db.get(row.opportunityId);
        return opp ? { ...opp, savedAt: row.savedAt } : null;
      }),
    );
    return items.filter((x): x is NonNullable<typeof x> => x !== null);
  },
});

export const toggle = mutation({
  args: { opportunityId: v.id("opportunities") },
  handler: async (ctx, { opportunityId }) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("savedOpportunities")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("opportunityId"), opportunityId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false };
    }
    await ctx.db.insert("savedOpportunities", {
      userId,
      opportunityId,
      savedAt: Date.now(),
    });
    return { saved: true };
  },
});
