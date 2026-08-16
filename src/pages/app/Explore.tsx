import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { OpportunityCard, type OpportunityListItem } from "@/components/OpportunityCard";
import { STREAMS } from "@/convex/lib/streams";
import { CATEGORIES, COUNTRIES, GRADES } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

const DEADLINES = [
  { value: "any", label: "Any time" },
  { value: "7", label: "Within 7 days" },
  { value: "30", label: "Within 30 days" },
  { value: "90", label: "Within 90 days" },
];

export default function Explore() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState<string | undefined>(searchParams.get("category") ?? undefined);
  const [stream, setStream] = useState<string | undefined>(searchParams.get("stream") ?? undefined);
  const [country, setCountry] = useState<string | undefined>(undefined);
  const [grade, setGrade] = useState<string | undefined>(undefined);
  const [deadline, setDeadline] = useState<string>("any");
  const [remote, setRemote] = useState(false);
  const [free, setFree] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<OpportunityListItem[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setOffset(0);
    setItems([]);
  }, [debounced, category, stream, country, grade, deadline, remote, free, verifiedOnly]);

  const page = useQuery(api.opportunities.list, {
    search: debounced || undefined,
    category,
    stream,
    country,
    grade,
    deadline,
    remote: remote || undefined,
    free: free || undefined,
    verifiedOnly: verifiedOnly || undefined,
    offset,
    limit: 12,
  });

  useEffect(() => {
    if (!page) return;
    setItems((prev) => {
      if (offset === 0) return page.items;
      const seen = new Set(prev.map((p) => p._id.toString()));
      return [...prev, ...page.items.filter((n) => !seen.has(n._id.toString()))];
    });
  }, [page, offset]);

  const hasFilters =
    !!category || !!stream || !!country || !!grade || deadline !== "any" || remote || free || verifiedOnly;

  const clearAll = () => {
    setCategory(undefined);
    setStream(undefined);
    setCountry(undefined);
    setGrade(undefined);
    setDeadline("any");
    setRemote(false);
    setFree(false);
    setVerifiedOnly(false);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Explore</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search the full catalog — {page ? `${page.total.toLocaleString()}` : "…"} opportunities across{" "}
          {COUNTRIES.length}+ countries.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search titles, providers, fields…"
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          className="gap-2 sm:w-auto"
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal className="size-4" />
          Filters
          {hasFilters && <span className="size-1.5 rounded-full bg-primary" />}
        </Button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setStream(undefined)}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
            !stream ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          All streams
        </button>
        {STREAMS.map((s) => (
          <button
            key={s.slug}
            type="button"
            onClick={() => setStream(stream === s.slug ? undefined : s.slug)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              stream === s.slug
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="mt-4 grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Label>Stream</Label>
            <Select value={stream ?? "all"} onValueChange={(v) => setStream(v === "all" ? undefined : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value="all">All streams</SelectItem>
                {STREAMS.map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>{s.emoji} {s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Category</Label>
            <Select value={category ?? "all"} onValueChange={(v) => setCategory(v === "all" ? undefined : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>{c.emoji} {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Country</Label>
            <Select value={country ?? "all"} onValueChange={(v) => setCountry(v === "all" ? undefined : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value="all">All countries</SelectItem>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Your grade</Label>
            <Select value={grade ?? "all"} onValueChange={(v) => setGrade(v === "all" ? undefined : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any grade</SelectItem>
                {GRADES.map((g) => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Deadline</Label>
            <Select value={deadline} onValueChange={setDeadline}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEADLINES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
            <Label htmlFor="remote">Remote only</Label>
            <Switch id="remote" checked={remote} onCheckedChange={setRemote} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
            <Label htmlFor="free">Free</Label>
            <Switch id="free" checked={free} onCheckedChange={setFree} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
            <Label htmlFor="verified">Verified only</Label>
            <Switch id="verified" checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
          </div>
          <div className="flex items-end">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={clearAll}>
              <X className="size-4" /> Clear all
            </Button>
          </div>
        </div>
      )}

      {!page && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl border bg-card" />
          ))}
        </div>
      )}

      {page && items.length === 0 && (
        <div className="mt-14 flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <span className="text-3xl">🗺️</span>
          <p className="font-semibold">Nothing matches those filters</p>
          <p className="max-w-sm text-sm text-muted-foreground">Try loosening a filter or two.</p>
          <Button variant="outline" size="sm" onClick={clearAll}>Clear filters</Button>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((opp) => (
          <OpportunityCard key={opp._id.toString()} opp={opp} />
        ))}
      </div>

      {page?.hasMore && (
        <div className="mt-10 flex justify-center">
          <Button variant="outline" className="gap-2 rounded-full" onClick={() => setOffset(offset + 12)}>
            <Loader2 className="size-4" />
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
