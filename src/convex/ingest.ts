/**
 * Bulk-import entry point for the full opportunity dataset (up to ~200k rows).
 *
 * The dataset is delivered as rows of the 15-column table (tab-separated).
 * Because a single mutation is capped at ~1MB, callers stream rows in chunks —
 * the /app/import page reads pasted text or an uploaded file in 2MB slices and
 * sends ≤1,000-row batches, with a few in flight at once.
 *
 * Idempotent: rows are deduplicated against the `by_sourceId` index (the
 * "Opportunity #40001"-style ID column), falling back to title::provider for
 * rows without an ID, so the built-in seed, the template-generated catalog,
 * and repeated imports never create duplicates — even once the table holds
 * hundreds of thousands of rows (the old approach scanned the first 5,000
 * documents and silently missed duplicates beyond that).
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";
import { rowToOpportunity, type CatalogOpportunityDoc } from "./lib/catalog";

/** Rows per call — keeps each payload ~350KB, comfortably under the 1MB cap. */
export const MAX_BATCH = 1000;

/** Parse rows into documents, skipping malformed rows and intra-batch dupes. */
function planDocs(
  rows: string[][],
  now: number,
): { docs: CatalogOpportunityDoc[]; skipped: number } {
  const docs: CatalogOpportunityDoc[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  rows.forEach((parts, i) => {
    const doc = rowToOpportunity(parts, { now, index: i });
    if (!doc) {
      skipped++;
      return;
    }
    const key = doc.sourceId ?? `${doc.title}::${doc.provider}`;
    if (seen.has(key)) {
      skipped++;
      return;
    }
    seen.add(key);
    docs.push(doc);
  });
  return { docs, skipped };
}

export const ingestBatch = mutation({
  args: { rows: v.array(v.array(v.string())) },
  handler: async (ctx, { rows }) => {
    // Admin-only: this is the curation pipeline, and arbitrary users must not
    // be able to inject rows into the public catalog.
    await requireAdmin(ctx);
    if (rows.length > MAX_BATCH) {
      throw new Error(`Batch too large — send at most ${MAX_BATCH} rows per call`);
    }
    const now = Date.now();
    const { docs, skipped: malformed } = planDocs(rows, now);

    // Index lookup — O(1) per row regardless of table size.
    const results = await Promise.all(
      docs.map(async (doc) => {
        const exists = doc.sourceId
          ? !!(await ctx.db
              .query("opportunities")
              .withIndex("by_sourceId", (q) => q.eq("sourceId", doc.sourceId!))
              .first())
          : !!(await ctx.db
              .query("opportunities")
              .withIndex("by_provider", (q) => q.eq("provider", doc.provider))
              .filter((q) => q.eq(q.field("title"), doc.title))
              .first());
        return { doc, exists };
      }),
    );
    const fresh = results.filter((r) => !r.exists).map((r) => r.doc);
    const existing = results.length - fresh.length;

    // Insert with bounded concurrency (each insert is its own transaction).
    for (let i = 0; i < fresh.length; i += 100) {
      const chunk = fresh.slice(i, i + 100);
      await Promise.all(chunk.map((d) => ctx.db.insert("opportunities", d)));
    }
    return { inserted: fresh.length, skipped: malformed + existing };
  },
});
