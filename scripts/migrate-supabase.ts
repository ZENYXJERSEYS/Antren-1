/**
 * Antren → Supabase catalog migration.
 *
 * Reads the converted opportunity chunks (/tmp/antren-import/chunk-*.jsonl)
 * and bulk-inserts them into the `opportunities` table through PostgREST
 * using the service-role key. Idempotent: upserts on `source_id`.
 *
 * Requires:
 *   - supabase/schema.sql already applied in the Supabase SQL editor
 *   - env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *     (add them in the Keys tab — the platform injects them here)
 *
 * Run:  bun scripts/migrate-supabase.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CHUNK_DIR = "/tmp/antren-import";
const BATCH = 500;
const CONCURRENCY = 4;

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? "";

if (!url || !serviceKey) {
  console.error(
    "Missing credentials. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the Keys tab " +
      "(or pass them as env vars) and re-run.",
  );
  process.exit(1);
}

function rowToColumns(row: Record<string, unknown>): Record<string, unknown> {
  return {
    source_id: row.sourceId ?? null,
    title: row.title ?? "",
    subtitle: row.subtitle ?? "",
    description: row.description ?? "",
    short_description: row.shortDescription ?? "",
    provider: row.provider ?? "",
    official_url: row.officialUrl ?? "",
    category: row.category ?? "",
    sub_fields: row.subFields ?? [],
    location: row.location ?? "",
    country: row.country ?? "",
    remote: !!row.remote,
    eligibility: row.eligibility ?? "",
    grade_eligibility: row.gradeEligibility ?? [],
    college_only: !!row.collegeOnly,
    is_free: !!row.isFree,
    cost: typeof row.cost === "number" ? row.cost : null,
    currency: row.currency ?? "USD",
    stipend_text: row.stipendText ?? "",
    deadline: typeof row.deadline === "number" ? row.deadline : Number(row.deadline ?? 0),
    rolling_deadline: !!row.rollingDeadline,
    duration: row.duration ?? "",
    application_method: row.applicationMethod ?? "",
    required_documents: row.requiredDocuments ?? [],
    verification_status: row.verificationStatus ?? "unverified",
    last_verified_at: typeof row.lastVerifiedAt === "number" ? row.lastVerifiedAt : null,
    verification_note: row.verificationNote ?? "",
    status: row.status ?? "published",
    media: row.media ?? [],
    tags: row.tags ?? [],
    featured: !!row.featured,
    is_new: !!row.isNew,
    views: typeof row.views === "number" ? row.views : Number(row.views ?? 0),
    created_at: typeof row.createdAt === "number" ? row.createdAt : Date.now(),
    updated_at: typeof row.updatedAt === "number" ? row.updatedAt : Date.now(),
    search_text: row.searchText ?? "",
  };
}

async function insertBatch(rows: Record<string, unknown>[], attempt = 0): Promise<void> {
  const res = await fetch(`${url}/rest/v1/opportunities?on_conflict=source_id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok && res.status !== 201 && res.status !== 200) {
    if (attempt < 4) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1) * 2));
      return insertBatch(rows, attempt + 1);
    }
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
}

async function main() {
  const chunkFilter = process.env.IMPORT_CHUNK;
  const files = readdirSync(CHUNK_DIR)
    .filter((f) => f.startsWith("chunk-") && f.endsWith(".jsonl"))
    .filter((f) => !chunkFilter || f.includes(chunkFilter))
    .sort();
  if (chunkFilter) console.log(`Filtering to chunks containing "${chunkFilter}".`);
  if (files.length === 0) {
    console.error(`No chunks found in ${CHUNK_DIR}`);
    process.exit(1);
  }
  console.log(`Found ${files.length} chunks.`);

  // Verify the table exists before starting.
  const check = await fetch(`${url}/rest/v1/opportunities?select=id&limit=1`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (check.status === 404 || check.status === 401) {
    console.error(
      `Can't reach the opportunities table (HTTP ${check.status}). Did you run supabase/schema.sql ` +
        "in the Supabase SQL editor, and is the service-role key correct?",
    );
    process.exit(1);
  }

  let total = 0;
  let queue: Promise<void>[] = [];
  const stats = { batches: 0, rows: 0 };

  for (const file of files) {
    const lines = readFileSync(join(CHUNK_DIR, file), "utf8")
      .split("\n")
      .filter((l) => l.trim());
    console.log(`${file}: ${lines.length} rows`);
    for (let i = 0; i < lines.length; i += BATCH) {
      const batch = lines.slice(i, i + BATCH).map((l) => {
        const row = JSON.parse(l);
        return rowToColumns(row);
      });
      queue.push(
        insertBatch(batch).then(() => {
          stats.batches += 1;
          stats.rows += batch.length;
          if (stats.batches % 10 === 0) {
            console.log(`  ${stats.rows.toLocaleString()} rows so far…`);
          }
        }),
      );
      if (queue.length >= CONCURRENCY) {
        await Promise.all(queue);
        queue = [];
      }
    }
  }
  if (queue.length) await Promise.all(queue);
  total = stats.rows;

  console.log(`\n✅ Imported ${total.toLocaleString()} opportunities.`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
