import { motion } from "framer-motion";
import { ArrowRight, Loader2, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OpportunityCard, type OpportunityListItem } from "@/components/OpportunityCard";
import { useAuth } from "@/hooks/use-auth";
import { CATEGORIES, OPPORTUNITY_SORTS } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

export default function ForYou() {
  const { user } = useAuth();
  const profile = useQuery(api.profiles.getMine);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState("recommended");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<OpportunityListItem[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setOffset(0);
    setItems([]);
  }, [debounced, category, sort]);

  const page = useQuery(api.opportunities.list, {
    search: debounced || undefined,
    category,
    sort,
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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (profile?.name ?? user?.name ?? "there").split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="size-4 text-primary" />
            Personalized for you
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {page ? `${page.total.toLocaleString()} opportunities matched your profile` : "Finding opportunities for you…"}
          </p>
        </div>
        {profile && !profile.onboardingComplete && (
          <Link to="/onboarding">
            <Button size="sm" className="gap-1.5">
              Finish setting up your profile <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search programs, providers, fields…"
            className="pl-10"
          />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPPORTUNITY_SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setCategory(undefined)}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
            !category ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => setCategory(category === c.slug ? undefined : c.slug)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              category === c.slug
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {!page && (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl border bg-card" />
          ))}
        </div>
      )}

      {page && items.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <span className="text-3xl">🔎</span>
          <p className="font-semibold">No opportunities found</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Try a different search, remove a category filter, or check back soon — new programs are added weekly.
          </p>
          <Button variant="outline" size="sm" onClick={() => { setSearch(""); setCategory(undefined); }}>
            Clear filters
          </Button>
        </div>
      )}

      <motion.div layout className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((opp) => (
          <OpportunityCard key={opp._id.toString()} opp={opp} />
        ))}
      </motion.div>

      {page?.hasMore && (
        <div className="mt-10 flex justify-center">
          <Button
            variant="outline"
            className="gap-2 rounded-full"
            onClick={() => setOffset(offset + 12)}
          >
            <Loader2 className="size-4" />
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
