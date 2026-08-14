import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

let seeding = false;

/**
 * Seeds the catalog once per session when the database is empty, so the
 * prototype is immediately explorable. `seedOpportunities` is idempotent.
 */
export function useSeedData() {
  const stats = useQuery(api.opportunities.stats);
  const seed = useMutation(api.seed.seedOpportunities);
  const started = useRef(false);

  useEffect(() => {
    if (!stats || stats.opportunities > 0 || seeding || started.current) return;
    started.current = true;
    seeding = true;
    void seed().finally(() => {
      seeding = false;
    });
  }, [stats, seed]);
}
