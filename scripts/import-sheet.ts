/**
 * One-off: convert the Google Sheet CSV (already downloaded to /tmp/sheet.csv)
 * into JSONL chunks that scripts/migrate-supabase.ts upserts into Supabase.
 *
 * Streaming + incremental CSV parsing keeps memory bounded for ~200k rows.
 *
 * The sheet has 16 columns — it inserts Field and Sub-Field before
 * Hear-back Time and has no Tags column. We remap to the 15-column catalog
 * format (Field + Sub-Field folded into Tags) so `rowToOpportunity` in
 * scripts/catalog.ts builds the documents.
 */
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rowToOpportunity } from "./catalog";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = "/tmp/antren-import";
const CHUNK_ROWS = 25_000;

/**
 * Incremental RFC-4180 CSV parser. Feed it string chunks; it returns complete
 * rows and keeps partial state internally. Handles quotes, escaped quotes,
 * and embedded newlines inside quoted fields.
 */
function makeCsvParser() {
  let buffer = "";
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const rows: string[][] = [];

  function push(chunk: string): string[][] {
    buffer += chunk;
    let i = 0;
    while (i < buffer.length) {
      const c = buffer[i];
      if (inQuotes) {
        if (c === '"') {
          if (buffer[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            inQuotes = false;
            i += 1;
          }
        } else {
          field += c;
          i += 1;
        }
      } else if (c === '"') {
        inQuotes = true;
        i += 1;
      } else if (c === ",") {
        row.push(field);
        field = "";
        i += 1;
      } else if (c === "\n") {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i += 1;
      } else if (c === "\r") {
        i += 1;
      } else {
        field += c;
        i += 1;
      }
    }
    buffer = buffer.slice(i);
    return rows.splice(0);
  }

  function flush(): string[][] {
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    }
    return rows;
  }

  return { push, flush };
}

/**
 * Sheet columns:
 *   0 ID, 1 Entry, 2 Type, 3 Cost, 4 Location, 5 Recurring Yearly,
 *   6 Intended Audience, 7 Apply Link, 8 Official Website, 9 Title,
 *   10 Organization Name, 11 Field, 12 Sub-Field, 13 Hear-back Time,
 *   14 Deadline, 15 Description
 * Catalog columns:
 *   0 ID, 1 Entry, 2 Type, 3 Cost, 4 Location, 5 Recurring Yearly,
 *   6 Intended Audience, 7 Apply Link, 8 Official Website, 9 Title,
 *   10 Organization Name, 11 Hear-back Time, 12 Deadline, 13 Tags, 14 Description
 */
function remapToCatalogRow(sheet: string[]): string[] {
  const tags = [sheet[11], sheet[12]].filter(Boolean).join(", ");
  return [
    sheet[0] ?? "",
    sheet[1] ?? "",
    sheet[2] ?? "",
    sheet[3] ?? "",
    sheet[4] ?? "",
    sheet[5] ?? "",
    sheet[6] ?? "",
    sheet[7] ?? "",
    sheet[8] ?? "",
    sheet[9] ?? "",
    sheet[10] ?? "",
    sheet[13] ?? "",
    sheet[14] ?? "",
    tags,
    sheet[15] ?? "",
  ];
}

async function main() {
  const parser = makeCsvParser();
  const seen = new Set<string>();
  let chunk: string[] = [];
  let chunkNum = 0;
  let total = 0;
  let skipped = 0;
  let headerSeen = false;
  let rowIndex = 0;
  const now = Date.now();

  function writeChunk(final = false) {
    if (chunk.length === 0) return;
    const file = join(OUT_DIR, `chunk-${String(chunkNum).padStart(2, "0")}.jsonl`);
    writeFileSync(file, chunk.join("\n") + "\n");
    console.log(
      `Wrote ${file} (${chunk.length} docs, ${Math.round(chunk.join("").length / 1024)} KB)`,
    );
    chunk = [];
    chunkNum++;
    if (!final) {
      chunk = [];
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const stream = createReadStream("/tmp/sheet.csv", { encoding: "utf8" });
  for await (const chunkText of stream) {
    const rows = parser.push(chunkText as string);
    for (const r of rows) {
      if (!headerSeen) {
        headerSeen = true;
        const first = r[0]?.replace(/^\uFEFF/, "");
        if (first === "ID" || r.length < 15) continue;
      }
      const doc = rowToOpportunity(remapToCatalogRow(r), { now, index: rowIndex++ });
      if (!doc) {
        skipped++;
        continue;
      }
      const key = doc.sourceId ?? `${doc.title}::${doc.provider}`;
      if (seen.has(key)) {
        skipped++;
        continue;
      }
      seen.add(key);
      chunk.push(JSON.stringify(doc));
      if (chunk.length >= CHUNK_ROWS) writeChunk();
      total++;
    }
  }
  const tail = parser.flush();
  for (const r of tail) {
    if (!headerSeen) {
      headerSeen = true;
      const first = r[0]?.replace(/^\uFEFF/, "");
      if (first === "ID" || r.length < 15) continue;
    }
    const doc = rowToOpportunity(remapToCatalogRow(r), { now, index: rowIndex++ });
    if (!doc) {
      skipped++;
      continue;
    }
    const key = doc.sourceId ?? `${doc.title}::${doc.provider}`;
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    chunk.push(JSON.stringify(doc));
    total++;
  }
  writeChunk(true);

  console.log(`Done: ${total} docs, ${skipped} skipped, ${chunkNum} chunks in ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
