/**
 * One-time purge of placeholder rows whose apply link points at the
 * non-existent antren.app domain (legacy seed data / import fallbacks).
 *
 * Flag-guarded so the full-table scan runs exactly once per deployment:
 * after the first successful pass there is nothing left to find, so later
 * sessions skip the scan entirely.
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

const FLAG_KEY = "antren_purged";

export const purgeFakeOpportunities = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const flag = await ctx.db
      .query("appFlags")
      .withIndex("by_key", (q) => q.eq("key", FLAG_KEY))
      .first();
    if (flag) {
      return { purged: 0, alreadyDone: true };
    }

    // Collect matching ids across all pages first, then delete — mutating a
    // table while paginating it can skip rows.
    const toDelete: string[] = [];
    let cursor: string | null = null;
    do {
      const page = await ctx.db
        .query("opportunities")
        .paginate({ numItems: 500, cursor });
      for (const opp of page.page) {
        if (opp.officialUrl.includes("antren.app")) {
          toDelete.push(opp._id);
        }
      }
      cursor = page.isDone ? null : page.continueCursor;
    } while (cursor);

    await Promise.all(toDelete.map((id) => ctx.db.delete(id as never)));

    await ctx.db.insert("appFlags", { key: FLAG_KEY, value: true });
    return { purged: toDelete.length, alreadyDone: false };
  },
});

/**
 * Delete up to `limit` opportunities whose sourceId falls in
 * [min, max] (lexicographic — sourceIds are zero-padded numeric strings,
 * so this is an exact numeric range). Used to clean up a double-imported
 * chunk: run repeatedly until it returns 0, then re-import the chunk once.
 */
/**
 * Remove duplicate rows within a sourceId range. The by_sourceId index
 * orders rows by sourceId, so duplicates are adjacent — a single ascending
 * scan deletes every occurrence after the first. Call repeatedly with
 * `min` = the returned `last` cursor until `scanned < limit` (range
 * exhausted). Bounded reads (~limit docs per call) keep each invocation
 * well under the 16MB function limit even at 200k+ rows.
 */
export const dedupeBySourceId = mutation({
  args: {
    min: v.string(),
    max: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, { min, max, limit }) => {
    await requireAdmin(ctx);
    const cap = Math.min(limit, 5000);
    const batch = await ctx.db
      .query("opportunities")
      .withIndex("by_sourceId", (q) => q.gte("sourceId", min).lte("sourceId", max))
      .take(cap);
    const seen = new Set<string>();
    let deleted = 0;
    let last = min;
    for (const doc of batch) {
      if (!doc.sourceId) continue;
      last = doc.sourceId;
      if (seen.has(doc.sourceId)) {
        await ctx.db.delete(doc._id);
        deleted++;
      } else {
        seen.add(doc.sourceId);
      }
    }
    return { scanned: batch.length, deleted, last };
  },
});

export const purgeSourceIdRange = mutation({
  args: {
    min: v.string(),
    max: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, { min, max, limit }) => {
    const batch = await ctx.db
      .query("opportunities")
      .withIndex("by_sourceId", (q) => q.gte("sourceId", min).lte("sourceId", max))
      .take(limit);
    for (const doc of batch) {
      await ctx.db.delete(doc._id);
    }
    return { deleted: batch.length };
  },
});
