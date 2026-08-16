import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

let seeding = false;

/**
 * Seeds the catalog once per session. Both seed mutations are idempotent and
 * incremental (they insert only records not already present), so running them
 * on every session is how new catalog rows (e.g. the template-generated
 * 1,500) reach already-populated databases.
 *
 * The seed mutations are admin-gated; failures are ignored here so anonymous
 * visitors and non-admin users don't log unhandled rejections. The first user
 * to complete onboarding is promoted to admin, which is what actually seeds
 * the catalog on a fresh deployment.
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
    void Promise.all([seed(), seedExtra()])
      .catch(() => {})
      .finally(() => {
        seeding = false;
      });
  }, [stats, seed, seedExtra]);
}
