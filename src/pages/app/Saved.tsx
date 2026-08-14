import { Bookmark, BookmarkX } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { OpportunityCard, type OpportunityListItem } from "@/components/OpportunityCard";

export default function Saved() {
  const saved = useQuery(api.saves.listMine);
  const [removed, setRemoved] = useState<string[]>([]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Bookmark className="size-5" />
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Saved</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {saved ? `${Math.max(0, saved.length - removed.length)} saved for later` : "Loading your bookmarks…"}
          </p>
        </div>
      </div>

      {saved && saved.filter((o) => !removed.includes(o._id.toString())).length === 0 && (
        <div className="mt-14 flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <span className="text-3xl">🔖</span>
          <p className="font-semibold">Nothing saved yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Tap the bookmark on any opportunity to keep it here for later.
          </p>
          <Link to="/app/explore">
            <Button className="gap-2 rounded-full">Explore opportunities</Button>
          </Link>
        </div>
      )}

      {saved && saved.filter((o) => !removed.includes(o._id.toString())).length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {saved
            .filter((o) => !removed.includes(o._id.toString()))
            .map((o) => (
              <div key={o._id.toString()} className="relative">
                <OpportunityCard
                  opp={o as OpportunityListItem}
                  saved
                  onSavedChange={(id, isSaved) => {
                    if (!isSaved) setRemoved((r) => [...r, id]);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 bottom-2 z-10 gap-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => setRemoved((r) => [...r, o._id.toString()])}
                >
                  <BookmarkX className="size-4" /> Unsave
                </Button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
