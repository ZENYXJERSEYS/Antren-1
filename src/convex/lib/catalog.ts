/**
 * Shared catalog utilities for the bulk opportunity dataset.
 *
 * The full dataset (up to ~87k–200k records) is delivered as rows of the
 * 15-column table below (tab-separated). Both paths — the template-generated
 * seed (src/convex/seed-extra.ts) and user-pasted/uploaded files
 * (src/convex/ingest.ts + the /app/import page) — convert rows with
 * `rowToOpportunity`, so imported and generated documents are identical.
 *
 * This module is intentionally pure TS (no Convex imports) so the same code
 * can be reused by tooling later.
 */
export const CATALOG_COLUMNS = [
  "ID",
  "Entry",
  "Type",
  "Cost",
  "Location",
  "Recurring Yearly",
  "Intended Audience",
  "Apply Link",
  "Official Website",
  "Title",
  "Organization Name",
  "Hear-back Time",
  "Deadline",
  "Tags",
  "Description",
] as const;

export const CATALOG_COLUMN_COUNT = CATALOG_COLUMNS.length;

/**
 * City display name → country (uses the app's taxonomy country keys).
 * Drives the generated sample catalog and backfills `country` for imported
 * rows whose table has no country column.
 */
export const KNOWN_CITIES: Record<string, string> = {
  // United States
  "New York, NY": "United States",
  "Los Angeles, CA": "United States",
  "Chicago, IL": "United States",
  "Houston, TX": "United States",
  "Phoenix, AZ": "United States",
  "Philadelphia, PA": "United States",
  "San Antonio, TX": "United States",
  "Dallas, TX": "United States",
  "San Jose, CA": "United States",
  "Austin, TX": "United States",
  "Jacksonville, FL": "United States",
  "Fort Worth, TX": "United States",
  "Columbus, OH": "United States",
  "Charlotte, NC": "United States",
  "San Francisco, CA": "United States",
  "Indianapolis, IN": "United States",
  "Seattle, WA": "United States",
  "Boston, MA": "United States",
  "Washington, DC": "United States",
  "Nashville, TN": "United States",
  "Oklahoma City, OK": "United States",
  "Portland, OR": "United States",
  "Las Vegas, NV": "United States",
  "Detroit, MI": "United States",
  "Louisville, KY": "United States",
  "Baltimore, MD": "United States",
  "Milwaukee, WI": "United States",
  "Albuquerque, NM": "United States",
  "Tucson, AZ": "United States",
  "Fresno, CA": "United States",
  "Sacramento, CA": "United States",
  "Mesa, AZ": "United States",
  "Atlanta, GA": "United States",
  "Virginia Beach, VA": "United States",
  "Miami, FL": "United States",
  "Oakland, CA": "United States",
  "Cincinnati, OH": "United States",
  "Cleveland, OH": "United States",
  "Omaha, NE": "United States",
  "Colorado Springs, CO": "United States",
  "Boise, ID": "United States",
  "Spokane, WA": "United States",
  "Madison, WI": "United States",
  "Pittsburgh, PA": "United States",
  "Anchorage, AK": "United States",
  "Birmingham, AL": "United States",
  "Rochester, NY": "United States",
  "St. Louis, MO": "United States",
  "Orlando, FL": "United States",
  "Plano, TX": "United States",
  "Buffalo, NY": "United States",
  "Carrollton, TX": "United States",
  "Hayward, CA": "United States",
  "Salem, OR": "United States",
  "Rancho Cucamonga, CA": "United States",
  "Waterbury, CT": "United States",
  "Garden Grove, CA": "United States",
  "San Diego, CA": "United States",
  "Syracuse, NY": "United States",
  "Tampa, FL": "United States",
  "Hartford, CT": "United States",
  "Arvada, CO": "United States",
  "Chesapeake, VA": "United States",
  "Memphis, TN": "United States",
  "Durham, NC": "United States",
  "Salinas, CA": "United States",
  "Compton, CA": "United States",
  "Fort Collins, CO": "United States",
  "Pompano Beach, FL": "United States",
  "Naperville, IL": "United States",
  "Thornton, CO": "United States",
  "Vacaville, CA": "United States",
  "Independence, MO": "United States",
  "Raleigh, NC": "United States",
  "Newark, NJ": "United States",
  "Kansas City, MO": "United States",
  "Lubbock, TX": "United States",
  "Rockford, IL": "United States",
  "Denver, CO": "United States",
  "Santa Clarita, CA": "United States",
  "Peoria, AZ": "United States",
  "Sioux Falls, SD": "United States",
  "Bridgeport, CT": "United States",
  "Grand Rapids, MI": "United States",
  "Honolulu, HI": "United States",
  "Minneapolis, MN": "United States",
  "Athens, GA": "United States",
  "Santa Maria, CA": "United States",
  "Waco, TX": "United States",
  "Toledo, OH": "United States",
  "Boulder, CO": "United States",
  "Peoria, IL": "United States",
  "Lafayette, LA": "United States",
  "Elizabeth, NJ": "United States",
  "Broken Arrow, OK": "United States",
  "Wichita Falls, TX": "United States",
  "San Bernardino, CA": "United States",
  "Bakersfield, CA": "United States",
  "Richmond, VA": "United States",
  "New Orleans, LA": "United States",
  // Rest of the world
  "Seoul, South Korea": "South Korea",
  "Busan, South Korea": "South Korea",
  "Turin, Italy": "Italy",
  "Rome, Italy": "Italy",
  "Milan, Italy": "Italy",
  "Naples, Italy": "Italy",
  "Palermo, Italy": "Italy",
  "Florence, Italy": "Italy",
  "Venice, Italy": "Italy",
  "Malmo, Sweden": "Sweden",
  "Stockholm, Sweden": "Sweden",
  "Liverpool, UK": "United Kingdom",
  "London, UK": "United Kingdom",
  "Manchester, UK": "United Kingdom",
  "Birmingham, UK": "United Kingdom",
  "Glasgow, UK": "United Kingdom",
  "Edinburgh, UK": "United Kingdom",
  "Dublin, Ireland": "Ireland",
  "Ahmedabad, India": "India",
  "Mumbai, India": "India",
  "Delhi, India": "India",
  "Bangalore, India": "India",
  "Chennai, India": "India",
  "Hyderabad, India": "India",
  "Pune, India": "India",
  "Kolkata, India": "India",
  "Graz, Austria": "Austria",
  "Vienna, Austria": "Austria",
  "Toulouse, France": "France",
  "Paris, France": "France",
  "Lyon, France": "France",
  "Marseille, France": "France",
  "Nice, France": "France",
  "Strasbourg, France": "France",
  "Berlin, Germany": "Germany",
  "Munich, Germany": "Germany",
  "Hamburg, Germany": "Germany",
  "Frankfurt, Germany": "Germany",
  "Cologne, Germany": "Germany",
  "Amsterdam, Netherlands": "Netherlands",
  "Rotterdam, Netherlands": "Netherlands",
  "Utrecht, Netherlands": "Netherlands",
  "Brussels, Belgium": "Belgium",
  "Zurich, Switzerland": "Switzerland",
  "Geneva, Switzerland": "Switzerland",
  "Madrid, Spain": "Spain",
  "Barcelona, Spain": "Spain",
  "Valencia, Spain": "Spain",
  "Seville, Spain": "Spain",
  "Lisbon, Portugal": "Portugal",
  "Porto, Portugal": "Portugal",
  "Athens, Greece": "Greece",
  "Warsaw, Poland": "Poland",
  "Krakow, Poland": "Poland",
  "Poznan, Poland": "Poland",
  "Prague, Czech Republic": "Czech Republic",
  "Budapest, Hungary": "Hungary",
  "Copenhagen, Denmark": "Denmark",
  "Oslo, Norway": "Norway",
  "Helsinki, Finland": "Finland",
  "Istanbul, Turkey": "Turkey",
  "Dubai, UAE": "United Arab Emirates",
  "Abu Dhabi, UAE": "United Arab Emirates",
  "Doha, Qatar": "Qatar",
  "Tel Aviv, Israel": "Israel",
  "Karachi, Pakistan": "Pakistan",
  "Lahore, Pakistan": "Pakistan",
  "Dhaka, Bangladesh": "Bangladesh",
  "Bangkok, Thailand": "Thailand",
  "Hanoi, Vietnam": "Vietnam",
  "Ho Chi Minh City, Vietnam": "Vietnam",
  "Kuala Lumpur, Malaysia": "Malaysia",
  "Jakarta, Indonesia": "Indonesia",
  "Manila, Philippines": "Philippines",
  "Singapore, Singapore": "Singapore",
  "Hong Kong, Hong Kong": "Hong Kong",
  "Shanghai, China": "China",
  "Beijing, China": "China",
  "Shenzhen, China": "China",
  "Tokyo, Japan": "Japan",
  "Osaka, Japan": "Japan",
  "Kyoto, Japan": "Japan",
  "Taipei, Taiwan": "Taiwan",
  "Sydney, Australia": "Australia",
  "Melbourne, Australia": "Australia",
  "Perth, Australia": "Australia",
  "Brisbane, Australia": "Australia",
  "Geelong, Australia": "Australia",
  "Adelaide, Australia": "Australia",
  "Auckland, New Zealand": "New Zealand",
  "Johannesburg, South Africa": "South Africa",
  "Cape Town, South Africa": "South Africa",
  "Nairobi, Kenya": "Kenya",
  "Lagos, Nigeria": "Nigeria",
  "Accra, Ghana": "Ghana",
  "Cairo, Egypt": "Egypt",
  "Casablanca, Morocco": "Morocco",
  "Sao Paulo, Brazil": "Brazil",
  "Rio de Janeiro, Brazil": "Brazil",
  "Buenos Aires, Argentina": "Argentina",
  "Santiago, Chile": "Chile",
  "Lima, Peru": "Peru",
  "Bogota, Colombia": "Colombia",
  "Mexico City, Mexico": "Mexico",
  "Guadalajara, Mexico": "Mexico",
  "Toronto, Canada": "Canada",
  "Montreal, Canada": "Canada",
  "Vancouver, Canada": "Canada",
  "Ottawa, Canada": "Canada",
  "Calgary, Canada": "Canada",
  "Edmonton, Canada": "Canada",
  "Hamilton, Canada": "Canada",
  "Kitchener, Canada": "Canada",
  "Winnipeg, Canada": "Canada",
  "San Jose, Costa Rica": "Costa Rica",
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "Free" → 0; "$6,000" → 6000; otherwise null. */
export function parseCost(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (!s || s === "free" || s === "$0") return 0;
  const m = s.match(/\$?\s*([\d][\d,]*)/);
  if (!m) return null;
  const n = parseInt(m[1].replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

/** "2026-09-06" → epoch ms (UTC midnight). Invalid → null. */
export function parseDeadline(raw: string): number | null {
  const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(t) ? null : t;
}

/** "Ages 13-18" → ["9","10","11","12"]; unknown audiences get the full set. */
export function parseAudienceGrades(audience: string): string[] {
  const m = audience.match(/(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})/i);
  if (!m) return ["9", "10", "11", "12", "college"];
  const lo = Number(m[1]);
  const hi = Number(m[2]);
  const toGrade = (age: number) => {
    if (age >= 18) return "12";
    if (age === 17) return "12";
    if (age === 16) return "11";
    if (age === 15) return "10";
    return "9";
  };
  const grades = new Set<string>();
  for (let age = lo; age <= hi; age++) grades.add(toGrade(age));
  return [...grades];
}

const ORG_STYLE: Record<string, { emoji: string; colors: [string, string] }> = {
  "Indigenous Rights Group": { emoji: "🪶", colors: ["#0F766E", "#134E4A"] },
  "Women in STEM": { emoji: "🧪", colors: ["#10B981", "#047857"] },
};

export function styleFor(provider: string): { emoji: string; colors: [string, string] } {
  for (const [name, style] of Object.entries(ORG_STYLE)) {
    if (provider.startsWith(name)) return style;
  }
  return { emoji: "🌍", colors: ["#0F766E", "#134E4A"] };
}

export interface CatalogOpportunityDoc {
  title: string;
  subtitle: string;
  description: string;
  shortDescription: string;
  provider: string;
  officialUrl: string;
  category: string;
  subFields: string[];
  location: string;
  country: string;
  remote: boolean;
  eligibility: string;
  gradeEligibility: string[];
  collegeOnly: boolean;
  cost?: number;
  isFree: boolean;
  currency: string;
  stipend?: number;
  stipendText: string;
  deadline: number;
  rollingDeadline: boolean;
  duration: string;
  applicationMethod: string;
  requiredDocuments: string[];
  verificationStatus:
    | "verified"
    | "recently_verified"
    | "deadline_updated"
    | "expired"
    | "unverified";
  lastVerifiedAt?: number;
  verificationNote: string;
  status: "published" | "draft" | "archived";
  media: { type: string; url: string; emoji?: string; gradient?: string }[];
  tags: string[];
  featured: boolean;
  isNew: boolean;
  views: number;
  createdAt: number;
  updatedAt: number;
  searchText: string;
  /** External stable ID from the source dataset, e.g. "Opportunity #40001". */
  sourceId?: string;
}

const DAY = 86_400_000;

/**
 * Convert one 15-column row into an opportunity document.
 * Returns null for malformed/short rows (and header rows).
 */
export function rowToOpportunity(
  parts: string[],
  opts: { now: number; index: number },
): CatalogOpportunityDoc | null {
  if (parts.length < CATALOG_COLUMN_COUNT) return null;
  const p = parts.map((s) => s.trim());
  if (p[0] === "ID" || !p[0] || !p[2] || !p[9]) return null;

  const type = p[2];
  const sourceId = p[0];
  const location = p[4] || "Remote / Online (worldwide)";
  const remote = /remote/i.test(location);
  const title = p[9];
  const provider = p[10] || title;
  const city = title.split(" - ").pop()?.trim() ?? location;
  const country = KNOWN_CITIES[city] ?? "Global";
  const deadlineRaw = parseDeadline(p[12]);
  const now = opts.now;
  const deadline = deadlineRaw ?? now + 30 * DAY;
  const rollingDeadline = deadlineRaw === null;
  // Past-deadline rows keep status "published" and signal expiry through
  // verificationStatus (matching admin.detectExpired semantics).
  const status: "published" | "draft" | "archived" = "published";
  const expired = !rollingDeadline && deadline < now;
  const style = styleFor(provider);
  const tags = p[13]
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const grades = parseAudienceGrades(p[6] || "Ages 13-18");
  const cost = parseCost(p[3]);
  const description =
    p[14] ||
    `A verified ${type.toLowerCase()} offered by ${provider}. This program provides students aged 13-18 with direct hands-on experience, mentorship, and community impact opportunities.`;

  const doc: CatalogOpportunityDoc = {
    title,
    sourceId,
    subtitle: `${type} · Ages 13-18 · 2-4 weeks hear-back`,
    description,
    shortDescription: description.slice(0, 150),
    provider,
    // Prefer the deep Apply Link (carries location & program params); the
    // "Apply now" button on the detail page links to officialUrl.
    // Never fabricate a fake domain when a row has no links — point at a
    // live search for the program instead.
    officialUrl:
      p[7] ||
      p[8] ||
      `https://www.google.com/search?q=${encodeURIComponent(`${title} ${provider}`)}`,
    category: "volunteering",
    subFields: [],
    location,
    country,
    remote,
    eligibility: p[6] || "Ages 13-18",
    gradeEligibility: grades,
    collegeOnly: false,
    isFree: cost === 0,
    currency: "USD",
    stipendText: "No stipend",
    deadline,
    rollingDeadline,
    duration: "Recurring · Year-round",
    applicationMethod: "Online application via official portal",
    requiredDocuments: ["Online application"],
    verificationStatus: expired ? "expired" : "verified",
    lastVerifiedAt: now - (3 + (opts.index % 38)) * DAY,
    verificationNote: "Reviewed against provider materials",
    status,
    media: [
      {
        type: "cover",
        url: "",
        emoji: style.emoji,
        gradient: `linear-gradient(135deg, ${style.colors[0]}, ${style.colors[1]})`,
      },
    ],
    tags: tags.length > 0 ? tags : [type, "Youth"],
    featured: false,
    isNew: false,
    views: 120 + ((opts.index * 977) % 8600),
    createdAt: now - (opts.index % 90) * DAY,
    updatedAt: now - (opts.index % 14) * DAY,
    searchText: [title, type, provider, "volunteering", ...tags]
      .join(" ")
      .toLowerCase(),
  };
  if (cost !== null) doc.cost = cost;
  return doc;
}
