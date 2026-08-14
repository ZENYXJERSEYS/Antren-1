import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("applications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const items = await Promise.all(
      rows.map(async (row) => {
        const opp = await ctx.db.get(row.opportunityId);
        return opp ? { ...row, opportunity: opp } : null;
      }),
    );
    return items.filter((x): x is NonNullable<typeof x> => x !== null);
  },
});

/** Counts per pipeline stage + saved opps, for the goal dashboard. */
export const pipeline = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const [rows, savedRows, savedOpps] = await Promise.all([
      ctx.db.query("applications").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("savedOpportunities").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("savedOpportunities").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    ]);

    const counts: Record<string, number> = {
      saved: 0,
      researching: 0,
      drafted: 0,
      submitted: 0,
      interview: 0,
      accepted: 0,
      rejected: 0,
    };
    for (const r of rows) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    }

    // Saved-but-not-yet-tracked = applications table status "saved"? No: keep
    // the bookmark list separate — applications.saved is the first pipeline
    // stage entered explicitly.
    const savedList = await Promise.all(
      savedOpps.map(async (r) => {
        const opp = await ctx.db.get(r.opportunityId);
        return opp
          ? {
              ...opp,
              savedAt: r.savedAt,
              status: "saved" as const,
              deadline: opp.deadline,
            }
          : null;
      }),
    );

    void savedRows;

    const inPipeline = new Set(rows.map((r) => r.opportunityId.toString()));
    const bookmarked = savedList.filter((o): o is NonNullable<typeof o> => o !== null && !inPipeline.has(o._id.toString()));

    const tracked = await Promise.all(
      rows.map(async (r) => {
        const opp = await ctx.db.get(r.opportunityId);
        return opp ? { ...r, opportunity: opp } : null;
      }),
    );

    return {
      counts,
      tracked: tracked.filter((x): x is NonNullable<typeof x> => x !== null),
      bookmarked,
      total: Object.values(counts).reduce((a, b) => a + b, 0) + bookmarked.length,
    };
  },
});

export const setStatus = mutation({
  args: {
    opportunityId: v.id("opportunities"),
    status: v.union(
      v.literal("saved"),
      v.literal("researching"),
      v.literal("drafted"),
      v.literal("submitted"),
      v.literal("interview"),
      v.literal("accepted"),
      v.literal("rejected"),
    ),
  },
  handler: async (ctx, { opportunityId, status }) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query("applications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("opportunityId"), opportunityId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { status, updatedAt: now });
      return { id: existing._id };
    }
    const id = await ctx.db.insert("applications", {
      userId,
      opportunityId,
      status,
      updatedAt: now,
      createdAt: now,
    });
    return { id };
  },
});

export const remove = mutation({
  args: { opportunityId: v.id("opportunities") },
  handler: async (ctx, { opportunityId }) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("applications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("opportunityId"), opportunityId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return true;
  },
});
