import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserIdSafe(ctx);
    if (!userId) return false;
    const user = await ctx.db.get(userId);
    return user?.role === "admin";
  },
});

async function requireUserIdSafe(ctx: Parameters<typeof requireAdmin>[0]) {
  try {
    const { userId } = await requireAdmin(ctx);
    return userId;
  } catch {
    return null;
  }
}

export const list = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    verification: v.optional(v.string()),
    category: v.optional(v.string()),
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserIdSafe(ctx);
    if (!userId) return { items: [], total: 0, hasMore: false, admin: false };
    const offset = args.offset ?? 0;
    const limit = Math.min(args.limit ?? 30, 100);

    let rows;
    if (args.search && args.search.trim()) {
      rows = await ctx.db
        .query("opportunities")
        .withSearchIndex("search_opportunities", (q) => q.search("searchText", args.search!.trim()))
        .take(500);
    } else {
      rows = await ctx.db.query("opportunities").take(1000);
    }

    const filtered = rows.filter((o) => {
      if (args.status && o.status !== args.status) return false;
      if (args.verification && o.verificationStatus !== args.verification) return false;
      if (args.category && o.category !== args.category) return false;
      return true;
    });

    filtered.sort((a, b) => b.updatedAt - a.updatedAt);
    const total = filtered.length;
    return {
      items: filtered.slice(offset, offset + limit),
      total,
      hasMore: offset + limit < total,
      admin: true,
    };
  },
});

export const update = mutation({
  args: {
    id: v.id("opportunities"),
    patch: v.object({
      title: v.optional(v.string()),
      subtitle: v.optional(v.string()),
      description: v.optional(v.string()),
      shortDescription: v.optional(v.string()),
      provider: v.optional(v.string()),
      officialUrl: v.optional(v.string()),
      category: v.optional(v.string()),
      subFields: v.optional(v.array(v.string())),
      location: v.optional(v.string()),
      country: v.optional(v.string()),
      remote: v.optional(v.boolean()),
      eligibility: v.optional(v.string()),
      gradeEligibility: v.optional(v.array(v.string())),
      cost: v.optional(v.number()),
      isFree: v.optional(v.boolean()),
      stipendText: v.optional(v.string()),
      deadline: v.optional(v.number()),
      rollingDeadline: v.optional(v.boolean()),
      duration: v.optional(v.string()),
      applicationMethod: v.optional(v.string()),
      requiredDocuments: v.optional(v.array(v.string())),
      verificationStatus: v.optional(
        v.union(
          v.literal("verified"),
          v.literal("recently_verified"),
          v.literal("deadline_updated"),
          v.literal("expired"),
          v.literal("unverified"),
        ),
      ),
      verificationNote: v.optional(v.string()),
      status: v.optional(v.union(v.literal("published"), v.literal("draft"), v.literal("archived"))),
      tags: v.optional(v.array(v.string())),
      featured: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { id, patch }) => {
    await requireAdmin(ctx);
    const opp = await ctx.db.get(id);
    if (!opp) throw new Error("Opportunity not found");
    const merged = { ...opp, ...patch, updatedAt: Date.now() };
    // Keep the search index in sync.
    if (patch.title || patch.subtitle || patch.provider || patch.category || patch.subFields || patch.tags) {
      merged.searchText = [
        merged.title,
        merged.subtitle,
        merged.provider,
        merged.category,
        ...merged.subFields,
        ...merged.tags,
      ]
        .join(" ")
        .toLowerCase();
    }
    await ctx.db.replace(id, merged);
    return true;
  },
});

export const setVerification = mutation({
  args: {
    ids: v.array(v.id("opportunities")),
    status: v.union(
      v.literal("verified"),
      v.literal("recently_verified"),
      v.literal("deadline_updated"),
      v.literal("expired"),
      v.literal("unverified"),
    ),
  },
  handler: async (ctx, { ids, status }) => {
    await requireAdmin(ctx);
    const now = Date.now();
    for (const id of ids) {
      const opp = await ctx.db.get(id);
      if (opp) {
        await ctx.db.patch(id, {
          verificationStatus: status,
          lastVerifiedAt: status === "unverified" ? undefined : now,
          verificationNote:
            status === "verified"
              ? "Manually verified by curator"
              : status === "recently_verified"
                ? "Recently reverified by curator"
                : status === "deadline_updated"
                  ? "Deadline updated by provider"
                  : status === "expired"
                    ? "Marked expired"
                    : "Pending manual review",
          updatedAt: now,
        });
      }
    }
    return ids.length;
  },
});

export const setStatus = mutation({
  args: {
    ids: v.array(v.id("opportunities")),
    status: v.union(v.literal("published"), v.literal("draft"), v.literal("archived")),
  },
  handler: async (ctx, { ids, status }) => {
    await requireAdmin(ctx);
    for (const id of ids) {
      const opp = await ctx.db.get(id);
      if (opp) await ctx.db.patch(id, { status, updatedAt: Date.now() });
    }
    return ids.length;
  },
});

export const remove = mutation({
  args: { id: v.id("opportunities") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
    return true;
  },
});

/** Detect and mark opportunities whose deadline has passed. */
export const detectExpired = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const rows = await ctx.db
      .query("opportunities")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(1000);
    let marked = 0;
    for (const o of rows) {
      if (!o.rollingDeadline && o.deadline < now) {
        await ctx.db.patch(o._id, {
          verificationStatus: "expired",
          updatedAt: now,
        });
        marked++;
      }
    }
    return marked;
  },
});

export const analytics = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserIdSafe(ctx);
    if (!userId) return null;
    const rows = await ctx.db.query("opportunities").take(1000);
    const now = Date.now();
    const byCategory: Record<string, number> = {};
    const byVerification: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let expiredCount = 0;
    let verifiedCount = 0;
    let totalViews = 0;
    for (const o of rows) {
      byCategory[o.category] = (byCategory[o.category] ?? 0) + 1;
      byVerification[o.verificationStatus] = (byVerification[o.verificationStatus] ?? 0) + 1;
      byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
      if (!o.rollingDeadline && o.deadline < now) expiredCount++;
      if (o.verificationStatus === "verified" || o.verificationStatus === "recently_verified") verifiedCount++;
      totalViews += o.views;
    }
    const providers = new Set(rows.map((o) => o.provider)).size;
    const recent = rows.filter((o) => o.createdAt > now - 30 * 86_400_000).length;
    const pendingVerification = rows.filter((o) => o.verificationStatus === "unverified").length;
    return {
      total: rows.length,
      verifiedCount,
      expiredCount,
      pendingVerification,
      providers,
      recent,
      totalViews,
      byCategory,
      byVerification,
      byStatus,
    };
  },
});

export const providers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserIdSafe(ctx);
    if (!userId) return [];
    const rows = await ctx.db.query("opportunities").take(1000);
    const map = new Map<string, number>();
    for (const o of rows) {
      map.set(o.provider, (map.get(o.provider) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 40);
  },
});

export const recentActivity = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserIdSafe(ctx);
    if (!userId) return [];
    const rows = await ctx.db.query("opportunities").take(1000);
    return rows
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 20)
      .map((o) => ({
        id: o._id,
        title: o.title,
        provider: o.provider,
        verificationStatus: o.verificationStatus,
        status: o.status,
        updatedAt: o.updatedAt,
      }));
  },
});
