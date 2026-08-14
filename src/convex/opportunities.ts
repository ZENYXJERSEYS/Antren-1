/**
 * The core opportunity engine — search, filters, sorting, pagination, and the
 * personalization match score. Built for 87,000+ records: every hot filter
 * path uses a dedicated index, full-text search uses the Convex search index,
 * and pagination is offset/limit with a stable sort.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserId, requireUserId } from "./lib/auth";

export type MatchResult = {
  score: number;
  reasons: string[];
};

/**
 * Compute the personalized match score for an opportunity vs. a student
 * profile. Pure function, easy to test and extend (e.g. add application
 * outcome history, search behavior, saved/skip signals).
 */
export function computeMatch(
  opp: {
    category: string;
    subFields: string[];
    gradeEligibility: string[];
    country: string;
    deadline: number;
    rollingDeadline: boolean;
    verificationStatus: string;
    featured: boolean;
    isNew: boolean;
  },
  profile: {
    grade: string;
    country: string;
    interests: string[];
    subFields: string[];
  } | null,
): MatchResult {
  if (!profile) {
    return { score: 50, reasons: ["Explore this opportunity"] };
  }

  let score = 20; // baseline
  const reasons: string[] = [];

  // Grade eligibility — the single most important signal.
  const eligible =
    opp.gradeEligibility.length === 0 ||
    opp.gradeEligibility.includes(profile.grade) ||
    opp.gradeEligibility.includes("any");
  if (eligible) {
    score += 25;
    reasons.push("Eligible for your grade");
  } else {
    score -= 15;
  }

  // Category interest
  if (profile.interests.includes(opp.category)) {
    score += 20;
    reasons.push(`Matches your ${labelFor(opp.category)} interest`);
  }

  // Sub-field interest overlap
  const overlap = opp.subFields.filter((s) => profile.subFields.includes(s));
  if (overlap.length > 0) {
    score += Math.min(20, overlap.length * 6);
    reasons.push(`Matches ${overlap.slice(0, 2).join(" + ")}`);
  }

  // Country availability
  if (opp.country === "Global" || opp.country === profile.country) {
    score += 10;
    reasons.push(opp.country === "Global" ? "Open worldwide" : "Available in your country");
  }

  // Deadline proximity — urgent and actionable.
  if (!opp.rollingDeadline && opp.deadline > Date.now()) {
    const days = Math.ceil((opp.deadline - Date.now()) / 86_400_000);
    if (days <= 7) {
      score += 10;
      reasons.push(`Deadline in ${days} day${days === 1 ? "" : "s"}`);
    } else if (days <= 30) {
      score += 5;
      reasons.push(`Closes in ${days} days`);
    }
  }

  // Trust + freshness
  if (opp.verificationStatus === "verified" || opp.verificationStatus === "recently_verified") {
    score += 5;
    reasons.push("Verified by our team");
  }
  if (opp.featured) score += 3;
  if (opp.isNew) score += 2;

  const final = Math.max(5, Math.min(99, Math.round(score)));
  if (reasons.length === 0) reasons.push("New addition worth exploring");
  return { score: final, reasons: reasons.slice(0, 4) };
}

function labelFor(category: string): string {
  const map: Record<string, string> = {
    volunteering: "Volunteering",
    internships: "Internships",
    competitions: "Competitions",
    jobs: "Jobs",
    "summer-programs": "Summer Programs",
    scholarships: "Scholarships",
    fellowships: "Fellowships",
    "events-conferences": "Events & Conferences",
    "research-programs": "Research Programs",
  };
  return map[category] ?? category;
}

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const [opps, profiles, users] = await Promise.all([
      ctx.db.query("opportunities").filter((q) => q.eq(q.field("status"), "published")).collect(),
      ctx.db.query("profiles").collect(),
      ctx.db.query("users").collect(),
    ]);
    return {
      opportunities: opps.length,
      verified: opps.filter((o) => o.verificationStatus === "verified" || o.verificationStatus === "recently_verified").length,
      categories: new Set(opps.map((o) => o.category)).size,
      countries: new Set(opps.map((o) => o.country)).size,
      users: profiles.length,
      isSampleData: true,
    };
  },
});

export const featured = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const opps = await ctx.db
      .query("opportunities")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
    const now = Date.now();
    return opps
      .filter((o) => o.featured && o.deadline > now)
      .sort((a, b) => b.deadline - a.deadline)
      .slice(0, limit ?? 6);
  },
});

const listArgs = {
  search: v.optional(v.string()),
  category: v.optional(v.string()),
  subField: v.optional(v.string()),
  country: v.optional(v.string()),
  grade: v.optional(v.string()),
  remote: v.optional(v.boolean()),
  free: v.optional(v.boolean()),
  verifiedOnly: v.optional(v.boolean()),
  deadline: v.optional(v.string()), // "any" | "7" | "30" | "90"
  sort: v.optional(v.string()),
  offset: v.optional(v.number()),
  limit: v.optional(v.number()),
};

export const list = query({
  args: listArgs,
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const profile = userId ? await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).first() : null;

    const offset = args.offset ?? 0;
    const limit = Math.min(args.limit ?? 12, 60);
    const now = Date.now();

    // 1. Pull a candidate set from the most selective index.
    let rows;
    if (args.search && args.search.trim()) {
      const results = await ctx.db
        .query("opportunities")
        .withSearchIndex("search_opportunities", (q) =>
          q.search("searchText", args.search!.trim()).eq("status", "published"),
        )
        .take(400);
      rows = results;
    } else if (args.category) {
      rows = await ctx.db
        .query("opportunities")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .take(1000);
    } else if (args.verifiedOnly) {
      rows = await ctx.db
        .query("opportunities")
        .withIndex("by_verification", (q) => q.eq("verificationStatus", "verified"))
        .take(1000);
    } else if (args.country) {
      rows = await ctx.db
        .query("opportunities")
        .withIndex("by_country", (q) => q.eq("country", args.country!))
        .take(1000);
    } else {
      rows = await ctx.db
        .query("opportunities")
        .withIndex("by_status", (q) => q.eq("status", "published"))
        .take(1000);
    }

    // 2. Apply remaining filters.
    const includeExpired = args.deadline === "any";
    const filtered = rows.filter((o) => {
      if (o.status !== "published") return false;
      if (o.category !== args.category && args.category) return false;
      if (args.subField && !o.subFields.includes(args.subField)) return false;
      if (args.country && o.country !== args.country) return false;
      if (args.remote !== undefined && o.remote !== args.remote) return false;
      if (args.free !== undefined && o.isFree !== args.free) return false;
      if (args.verifiedOnly && !["verified", "recently_verified"].includes(o.verificationStatus)) return false;
      if (args.grade && !o.gradeEligibility.includes(args.grade)) return false;
      const expired = o.deadline < now && !o.rollingDeadline;
      if (!includeExpired && expired) return false;
      if (args.deadline && args.deadline !== "any") {
        const days = Number(args.deadline);
        const closesIn = Math.ceil((o.deadline - now) / 86_400_000);
        if (o.rollingDeadline || closesIn > days) return false;
      }
      return true;
    });

    // 3. Sort.
    const sort = args.sort ?? "recommended";
    const withMatch = filtered.map((o) => ({
      opp: o,
      match: computeMatch(o, profile),
    }));

    switch (sort) {
      case "newest":
        withMatch.sort((a, b) => b.opp.createdAt - a.opp.createdAt);
        break;
      case "deadline":
        withMatch.sort((a, b) => {
          const da = a.opp.rollingDeadline ? Number.MAX_SAFE_INTEGER : a.opp.deadline;
          const db_ = b.opp.rollingDeadline ? Number.MAX_SAFE_INTEGER : b.opp.deadline;
          return da - db_;
        });
        break;
      case "relevance":
        // Search order is already relevance-ranked; keep stable.
        break;
      case "recommended":
      default:
        withMatch.sort((a, b) => {
          if (a.opp.featured !== b.opp.featured) return a.opp.featured ? -1 : 1;
          if (a.match.score !== b.match.score) return b.match.score - a.match.score;
          return (a.opp.rollingDeadline ? Number.MAX_SAFE_INTEGER : a.opp.deadline) -
            (b.opp.rollingDeadline ? Number.MAX_SAFE_INTEGER : b.opp.deadline);
        });
    }

    const total = withMatch.length;
    const page = withMatch.slice(offset, offset + limit).map(({ opp, match }) => ({
      ...opp,
      matchScore: match.score,
      matchReasons: match.reasons,
    }));

    return {
      items: page,
      total,
      hasMore: offset + limit < total,
      offset,
      limit,
    };
  },
});

export const get = query({
  args: { id: v.id("opportunities") },
  handler: async (ctx, { id }) => {
    const opp = await ctx.db.get(id);
    if (!opp || opp.status !== "published") return null;
    const userId = await getUserId(ctx);
    const profile = userId
      ? await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).first()
      : null;
    const [saved, application] = userId
      ? await Promise.all([
          ctx.db
            .query("savedOpportunities")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("opportunityId"), id))
            .first(),
          ctx.db
            .query("applications")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("opportunityId"), id))
            .first(),
        ])
      : [null, null];
    return {
      ...opp,
      matchScore: profile ? computeMatch(opp, profile).score : null,
      matchReasons: profile ? computeMatch(opp, profile).reasons : [],
      saved: !!saved,
      application: application ?? null,
    };
  },
});

export const similar = query({
  args: { id: v.id("opportunities"), limit: v.optional(v.number()) },
  handler: async (ctx, { id, limit }) => {
    const opp = await ctx.db.get(id);
    if (!opp) return [];
    const rows = await ctx.db
      .query("opportunities")
      .withIndex("by_category", (q) => q.eq("category", opp.category))
      .take(200);
    const now = Date.now();
    return rows
      .filter((o) => o._id !== id && o.status === "published" && o.deadline > now)
      .sort((a, b) => {
        const shared = (b.subFields.filter((s) => opp.subFields.includes(s)).length) -
          (a.subFields.filter((s) => opp.subFields.includes(s)).length);
        return shared || a.deadline - b.deadline;
      })
      .slice(0, limit ?? 6);
  },
});

export const recordView = mutation({
  args: { id: v.id("opportunities") },
  handler: async (ctx, { id }) => {
    const userId = await getUserId(ctx);
    if (!userId) return;
    await ctx.db.insert("opportunityViews", { userId, opportunityId: id, viewedAt: Date.now() });
    const opp = await ctx.db.get(id);
    if (opp) {
      await ctx.db.patch(id, { views: opp.views + 1 });
    }
  },
});

export const trackSearch = mutation({
  args: { query: v.string() },
  handler: async (ctx, { query }) => {
    const userId = await getUserId(ctx);
    if (!userId || !query.trim()) return;
    await ctx.db.insert("searchQueries", { userId, query: query.trim().slice(0, 200), createdAt: Date.now() });
  },
});

export const searchSuggestions = query({
  args: { search: v.string() },
  handler: async (ctx, { search }) => {
    if (!search.trim()) return [];
    const results = await ctx.db
      .query("opportunities")
      .withSearchIndex("search_opportunities", (q) => q.search("searchText", search.trim()).eq("status", "published"))
      .take(6);
    return results.map((o) => ({
      id: o._id,
      title: o.title,
      subtitle: o.subtitle,
      emoji: o.media[0]?.emoji ?? "✨",
      colors: o.media[0]?.gradient ?? undefined,
    }));
  },
});
