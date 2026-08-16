import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

let seeding = false;

/**
 * Seeds the catalog once per session. The seed mutations are idempotent and
 * incremental (they insert only records not already present), so running them
 * on every session is how new catalog rows (e.g. the template-generated
 * 1,500) reach already-populated databases.
 *
 * The purge runs after seeding so it can remove any rows that still link to
 * the non-existent antren.app domain (legacy seed/import fallbacks). All of
 * these are admin-gated; failures are ignored here so anonymous visitors and
 * non-admin users don't log unhandled rejections. The first user to complete
 * onboarding is promoted to admin, which is what actually seeds the catalog
 * on a fresh deployment.
 */
export function useSeedData() {
  const stats = useQuery(api.opportunities.stats);
  const seed = useMutation(api.seed.seedOpportunities);
  const seedExtra = useMutation(api.seedExtra.seedExtra);
  const purge = useMutation(api.purge.purgeFakeOpportunities);
  const started = useRef(false);

  useEffect(() => {
    if (!stats || seeding || started.current) return;
    started.current = true;
    seeding = true;
    void (async () => {
      try {
        await seed();
        await seedExtra();
        await purge();
      } catch {
        // Admin-gated mutations fail silently for non-admins.
      } finally {
        seeding = false;
      }
    })();
  }, [stats, seed, seedExtra, purge]);
}
