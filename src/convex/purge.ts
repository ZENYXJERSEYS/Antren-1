/**
 * One-time purge of placeholder rows whose apply link points at the
 * non-existent antren.app domain (legacy seed data / import fallbacks).
 *
 * Flag-guarded so the full-table scan runs exactly once per deployment:
 * after the first successful pass there is nothing left to find, so later
 * sessions skip the scan entirely.
 */
import { mutation } from "./_generated/server";
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
