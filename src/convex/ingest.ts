/**
 * Bulk-import entry point for the full opportunity dataset (up to ~200k rows).
 *
 * The dataset is delivered as rows of the 15-column table (tab-separated).
 * Because a single mutation is capped at ~1MB, callers stream rows in chunks
 * of ≤200 rows per call; the /app/import page does exactly that, reading
 * pasted text or an uploaded file in 2MB slices.
 *
 * Idempotent: rows whose title::provider already exists (from the built-in
 * seed, the template-generated catalog, or an earlier import) are skipped.
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { rowToOpportunity, type CatalogOpportunityDoc } from "./lib/catalog";

const MAX_BATCH = 200;

export const ingestBatch = mutation({
  args: { rows: v.array(v.array(v.string())) },
  handler: async (ctx, { rows }) => {
    if (rows.length > MAX_BATCH) {
      throw new Error(`Batch too large — send at most ${MAX_BATCH} rows per call`);
    }
    const now = Date.now();

    const existingRows = await ctx.db.query("opportunities").take(5000);
    const existing = new Set(existingRows.map((o) => `${o.title}::${o.provider}`));

    const docs: CatalogOpportunityDoc[] = [];
    const seen = new Set<string>();
    let skipped = 0;
    rows.forEach((parts, i) => {
      const doc = rowToOpportunity(parts, { now, index: i });
      if (!doc) {
        skipped++;
        return;
      }
      const key = `${doc.title}::${doc.provider}`;
      if (existing.has(key) || seen.has(key)) {
        skipped++;
        return;
      }
      seen.add(key);
      docs.push(doc);
    });

    for (let i = 0; i < docs.length; i += 200) {
      const batch = docs.slice(i, i + 200);
      await Promise.all(batch.map((d) => ctx.db.insert("opportunities", d)));
    }

    return { inserted: docs.length, skipped };
  },
});
