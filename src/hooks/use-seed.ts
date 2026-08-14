import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

let seeding = false;

/**
 * Seeds the catalog once per session. Both seed mutations are idempotent and
 * incremental (they insert only records not already present), so running them
 * on every session is how new catalog rows (e.g. the template-generated
 * 1,500) reach already-populated databases.
 */
export function useSeedData() {
  const stats = useQuery(api.opportunities.stats);
  const seed = useMutation(api.seed.seedOpportunities);
  const seedExtra = useMutation(api.seedExtra.seedExtra);
  const started = useRef(false);

  useEffect(() => {
    if (!stats || seeding || started.current) return;
    started.current = true;
    seeding = true;
    void Promise.all([seed(), seedExtra()]).finally(() => {
      seeding = false;
    });
  }, [stats, seed, seedExtra]);
}
