import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { CheckCircle2, ClipboardPaste, Database, FileUp, Loader2, Upload, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CATALOG_COLUMNS } from "@/convex/lib/catalog";

const BATCH = 1000; // rows per ingest mutation call (~350KB)
const CONCURRENCY = 3; // parallel in-flight ingest calls
const SLICE_BYTES = 2 * 1024 * 1024; // read uploaded files in 2MB slices

/** Parse lines of the 15-column table (tab-separated preferred; comma fallback). */
function splitRows(text: string): string[][] {
  const rows: string[][] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("ID\t") || line.startsWith("ID,")) continue;
    const parts = line.includes("\t") ? line.split("\t") : line.split(",");
    if (parts.length >= 15) rows.push(parts);
  }
  return rows;
}

/** Mirrors the server-side dedupe key: source ID, else title::provider. */
function keyFor(parts: string[]): string {
  return parts[0] || `${parts[9]}::${parts[10]}`;
}

export default function Import() {
  const ingest = useMutation(api.ingest.ingestBatch);
  const stats = useQuery(api.opportunities.stats);

  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<"paste" | "file" | null>(null);
  const [pasted, setPasted] = useState("");
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState<{
    done: number; // rows sent to the backend
    total: number | null; // null = streaming a file (unknown row count)
    readBytes: number;
    inserted: number;
    skipped: number;
  } | null>(null);
  const cancelled = useRef(false);

  const runImport = async (
    src: "paste" | "file",
    batches: string[][][] | AsyncGenerator<string[][]>,
    total: number | null,
  ) => {
    if (busy) return;
    setBusy(true);
    setSource(src);
    setProgress({ done: 0, total, readBytes: 0, inserted: 0, skipped: 0 });
    cancelled.current = false;

    const queue: string[][][] = [];
    let producerDone = false;
    let producerError: unknown = null;
    const seen = new Set<string>();
    let inserted = 0;
    let skipped = 0;

    // Produce batches lazily so file uploads stream while workers consume.
    const producer = (async () => {
      try {
        if (Array.isArray(batches)) {
          for (const b of batches) queue.push(b);
        } else {
          for await (const b of batches) queue.push(b);
        }
      } catch (err) {
        producerError = err;
      } finally {
        producerDone = true;
      }
    })();

    const worker = async () => {
      while (true) {
        if (cancelled.current) return;
        const batch = queue.shift();
        if (!batch) {
          if (producerDone) return;
          await new Promise((r) => setTimeout(r, 40));
          continue;
        }
        // Client-side dedupe across batches (the server dedupes against the DB).
        const fresh = batch.filter((parts) => {
          const k = keyFor(parts);
          if (seen.has(k)) {
            skipped++;
            return false;
          }
          seen.add(k);
          return true;
        });
        if (fresh.length === 0) continue;
        const res = await ingest({ rows: fresh });
        inserted += res.inserted;
        skipped += res.skipped;
        setProgress((p) => (p ? { ...p, done: p.done + fresh.length, inserted, skipped } : p));
      }
    };

    try {
      await Promise.all([producer, ...Array.from({ length: CONCURRENCY }, () => worker())]);
      if (producerError) throw producerError;
      if (cancelled.current) {
        toast.info(`Import cancelled — ${inserted.toLocaleString()} added so far.`);
        return;
      }
      toast.success(
        `Imported ${inserted.toLocaleString()} opportunities (${skipped.toLocaleString()} duplicates skipped).`,
      );
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
      if (!cancelled.current) setSource(null);
    }
  };

  const handlePaste = () => {
    const rows = splitRows(pasted);
    if (rows.length === 0) {
      toast.info("No rows found — check that each line has the 15 columns.");
      return;
    }
    const batches: string[][][] = [];
    for (let i = 0; i < rows.length; i += BATCH) batches.push(rows.slice(i, i + BATCH));
    void runImport("paste", batches, rows.length);
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    const gen = (async function* (): AsyncGenerator<string[][]> {
      const decoder = new TextDecoder();
      let buffer = "";
      let offset = 0;
      let pending: string[][] = [];
      while (offset < file.size) {
        const slice = await file.slice(offset, offset + SLICE_BYTES).arrayBuffer();
        buffer += decoder.decode(slice, { stream: true });
        offset += SLICE_BYTES;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        pending.push(...splitRows(lines.join("\n")));
        setProgress((p) => (p ? { ...p, readBytes: offset } : p));
        while (pending.length >= BATCH) yield pending.splice(0, BATCH);
      }
      buffer += decoder.decode();
      if (buffer.trim()) pending.push(...splitRows(buffer));
      while (pending.length > 0) yield pending.splice(0, BATCH);
    })();
    void runImport("file", gen, null);
  };

  const pct =
    progress && progress.total
      ? Math.min(100, Math.round((progress.done / progress.total) * 100))
      : 0;

  const rowLabel = progress?.total
    ? `${progress.done.toLocaleString()} / ${progress.total.toLocaleString()} rows`
    : progress && progress.readBytes > 0
      ? `${(progress.readBytes / (1024 * 1024)).toFixed(1)} MB read · ${progress.done.toLocaleString()} rows uploaded`
      : "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Database className="size-5" />
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Catalog Import</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {stats
              ? `${stats.opportunities.toLocaleString()}${stats.approximate ? "+" : ""} opportunities live in the catalog`
              : "Loading catalog stats…"}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileUp className="size-4 text-primary" /> Upload a file
            </CardTitle>
            <CardDescription>
              Best for the full dataset — save the rows as a <code>.csv</code> / <code>.tsv</code>{" "}
              / <code>.txt</code> file and upload it. Streamed in 2MB slices and imported in
              1,000-row batches with parallel workers. Handles up to ~200,000 rows in a few
              minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors hover:bg-accent/50">
              <Upload className="size-6 text-muted-foreground" />
              <span className="text-sm font-medium">{fileName || "Choose a file"}</span>
              <span className="text-xs text-muted-foreground">.csv · .tsv · .txt — tab or comma separated</span>
              <input
                type="file"
                accept=".csv,.tsv,.txt,text/plain,text/csv"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardPaste className="size-4 text-primary" /> Paste rows
            </CardTitle>
            <CardDescription>
              Good for smaller chunks (a few thousand rows). For the full dataset, save it as a
              file and use the upload instead — pasting 87,000+ rows will slow the browser down.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={"Opportunity #40001\tEntry 1 of 5000\tCultural Advocate\tFree\tBuffalo, NY\t…"}
              disabled={busy}
              className="min-h-40 w-full resize-y rounded-lg border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary disabled:opacity-60"
            />
            <Button
              onClick={handlePaste}
              disabled={busy || pasted.trim().length === 0}
              className="self-end gap-2 rounded-full"
            >
              {busy && source === "paste" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Import pasted rows
            </Button>
          </CardContent>
        </Card>
      </div>

      {busy && progress && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <Loader2 className="size-4 animate-spin text-primary" />
                Importing{source === "file" && fileName ? ` ${fileName}` : ""}…{" "}
                <span className="font-normal text-muted-foreground">{rowLabel}</span>
              </span>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <Progress value={progress.total ? pct : undefined} className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  cancelled.current = true;
                }}
              >
                <X className="size-3.5" /> Cancel
              </Button>
            </div>
            <div className="mt-3 flex gap-6 text-sm">
              <span className="flex items-center gap-1.5 text-primary">
                <CheckCircle2 className="size-4" /> {progress.inserted.toLocaleString()} added
              </span>
              <span className="text-muted-foreground">
                {progress.skipped.toLocaleString()} duplicates skipped
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator className="my-8" />

      <div className="text-sm text-muted-foreground">
        <h2 className="text-sm font-semibold text-foreground">Expected format</h2>
        <p className="mt-1 max-w-3xl">
          One row per opportunity, tab-separated, with these {CATALOG_COLUMNS.length} columns in
          order. Duplicates are detected by the source{" "}
          <span className="text-foreground">ID</span> column (or{" "}
          <span className="text-foreground">Title + Organization Name</span> when there's no ID)
          and skipped automatically, so re-importing the dataset is safe.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CATALOG_COLUMNS.map((c) => (
            <span
              key={c}
              className="rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground"
            >
              {c}
            </span>
          ))}
        </div>
        <pre className="mt-4 overflow-x-auto rounded-lg border bg-card p-3 font-mono text-[11px] leading-5">
{`Opportunity #40001\tEntry 1 of 5000\tCultural Advocate\tFree\tBuffalo, NY\tYes\tAges 13-18\thttps://www.indigenousrights.org/join?location=buffalo-ny&program=cultural-advocate\thttps://www.indigenousrights.org/join\tIndigenous Rights Group Cultural Advocate - Buffalo, NY\tIndigenous Rights Group (Buffalo, NY)\t2-4 weeks\t2026-09-06\tCultural Advocate, Youth, Buffalo, NY\tA verified cultural advocate offered by Indigenous Rights Group in Buffalo, NY.`}
        </pre>
      </div>
    </div>
  );
}
