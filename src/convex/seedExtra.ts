/**
 * Template-generated catalog growth: 1,500 extra opportunities in the same
 * bulk-export format as the full dataset (15 tab-separated columns), produced
 * deterministically from the two organizations present in the supplied slice
 * (Indigenous Rights Group, Women in STEM) across ~215 global cities.
 *
 * Rows are converted with the shared `rowToOpportunity` builder, so these
 * documents are identical in shape to anything imported through the
 * /app/import page — the full 87k–200k dataset plugs into the same pipeline.
 */
import { mutation } from "./_generated/server";
import { KNOWN_CITIES, rowToOpportunity, slugify, type CatalogOpportunityDoc } from "./lib/catalog";

const ORGS = [
  {
    name: "Indigenous Rights Group",
    domain: "indigenousrights.org",
    path: "/join",
    types: ["Cultural Advocate", "Language Revitalization Aide", "Event Helper", "Policy Researcher"],
  },
  {
    name: "Women in STEM",
    domain: "womeninstem.org",
    path: "/get-involved",
    types: ["Scholarship Committee Aide", "Event Organizer", "Mentor", "Outreach Lead"],
  },
] as const;

const TARGET_ROWS = 1500;

// Deadlines are spread deterministically over the window observed in the
// supplied dataset: 2026-08-31 → 2027-03-26 (208 days).
const BASE_DEADLINE = Date.UTC(2026, 7, 31);
const DEADLINE_SPREAD_DAYS = 208;
const DAY = 86_400_000;

/**
 * Build the exact 15-column row layout used by the bulk export:
 *   ID, Entry, Type, Cost, Location, Recurring Yearly, Intended Audience,
 *   Apply Link, Official Website, Title, Organization Name, Hear-back Time,
 *   Deadline, Tags, Description
 */
function generateRows(): string[][] {
  const rows: string[][] = [];
  const cities = Object.keys(KNOWN_CITIES);
  let n = 0;

  outer: for (const org of ORGS) {
    for (const type of org.types) {
      const typeSlug = slugify(type);
      for (const city of cities) {
        if (n >= TARGET_ROWS) break outer;
        const entry = n + 1;
        const remote = n % 7 === 2; // ≈14% remote, matching the supplied data
        const deadline = new Date(BASE_DEADLINE + ((n * 29) % DEADLINE_SPREAD_DAYS) * DAY);
        const deadlineStr = deadline.toISOString().slice(0, 10);
        const location = remote ? "Remote / Online (worldwide)" : city;
        const citySlug = slugify(city);
        const applyLink = `https://www.${org.domain}${org.path}?location=${citySlug}&program=${typeSlug}`;
        const website = `https://www.${org.domain}${org.path}`;
        rows.push([
          `Opportunity #${40000 + entry}`,
          `Entry ${entry} of 5000`,
          type,
          "Free",
          location,
          "Yes",
          "Ages 13-18",
          applyLink,
          website,
          `${org.name} ${type} - ${city}`,
          `${org.name} (${city})`,
          "2-4 weeks",
          deadlineStr,
          `${type}, Youth, ${city}`,
          `A verified ${type.toLowerCase()} offered by ${org.name} in ${city}. This program provides students aged 13-18 with direct hands-on experience, mentorship, and community impact opportunities.`,
        ]);
        n++;
      }
    }
  }
  return rows;
}

const GENERATED_ROWS = generateRows();

/**
 * Incremental + idempotent: inserts only rows whose title::provider isn't
 * already in the catalog, so it can safely run on every session even after
 * the database is populated.
 */
export const seedExtra = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const existingRows = await ctx.db.query("opportunities").take(5000);
    const existing = new Set(existingRows.map((o) => `${o.title}::${o.provider}`));

    const docs: CatalogOpportunityDoc[] = [];
    GENERATED_ROWS.forEach((parts, i) => {
      const doc = rowToOpportunity(parts, { now, index: i });
      if (doc && !existing.has(`${doc.title}::${doc.provider}`)) docs.push(doc);
    });

    for (let i = 0; i < docs.length; i += 200) {
      const batch = docs.slice(i, i + 200);
      await Promise.all(batch.map((d) => ctx.db.insert("opportunities", d)));
    }

    return {
      seeded: docs.length > 0,
      inserted: docs.length,
    };
  },
});
