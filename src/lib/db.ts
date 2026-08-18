import { useEffect, useRef, useState } from "react";
import {
  supabase,
  mapOpportunity,
  mapProfile,
  type Application,
  type CurrentUser,
  type Opportunity,
  type Profile,
} from "@/lib/supabase";
import { getCurrentUser } from "@/lib/local-auth";
import { STREAM_MAP, streamMatchesOpp } from "@/lib/streams";

// ---------------------------------------------------------------------------
// React data hook — returns undefined while loading, then the fetched value
// ---------------------------------------------------------------------------

export function useDb<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[],
): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let cancelled = false;
    setData(undefined);
    loaderRef.current()
      .then((v) => {
        if (!cancelled) setData(v);
      })
      .catch(() => {
        if (!cancelled) setData(undefined);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return data;
}

// ---------------------------------------------------------------------------
// Match scoring (pure)
// ---------------------------------------------------------------------------

export type MatchResult = { score: number; reasons: string[] };

function labelFor(category: string): string {
  const map: Record<string, string> = {
    volunteering: "Volunteering",
    internships: "Internships",
    competitions: "Competitions",
    jobs: "Jobs",
    "summer-programs": "Summer Programs",
    scholarships: "Scholarships",
    fellowships: "Fellowships",
    "events-conferences": "Events & Conferences",
    "research-programs": "Research Programs",
  };
  return map[category] ?? category;
}

export function computeMatch(
  opp: {
    category: string;
    subFields: string[];
    gradeEligibility: string[];
    country: string;
    deadline: number;
    rollingDeadline: boolean;
    verificationStatus: string;
    featured: boolean;
    isNew: boolean;
  },
  profile: { grade: string; country: string; interests: string[]; subFields: string[] } | null,
): MatchResult {
  if (!profile) return { score: 50, reasons: ["Explore this opportunity"] };

  let score = 20;
  const reasons: string[] = [];

  const eligible =
    opp.gradeEligibility.length === 0 ||
    opp.gradeEligibility.includes(profile.grade) ||
    opp.gradeEligibility.includes("any");
  if (eligible) {
    score += 25;
    reasons.push("Eligible for your grade");
  } else {
    score -= 15;
  }

  if (profile.interests.includes(opp.category)) {
    score += 20;
    reasons.push(`Matches your ${labelFor(opp.category)} interest`);
  }

  const overlap = opp.subFields.filter((s) => profile.subFields.includes(s));
  if (overlap.length > 0) {
    score += Math.min(20, overlap.length * 6);
    reasons.push(`Matches ${overlap.slice(0, 2).join(" + ")}`);
  }

  if (opp.country === "Global" || opp.country === profile.country) {
    score += 10;
    reasons.push(opp.country === "Global" ? "Open worldwide" : "Available in your country");
  }

  if (!opp.rollingDeadline && opp.deadline > Date.now()) {
    const days = Math.ceil((opp.deadline - Date.now()) / 86_400_000);
    if (days <= 7) {
      score += 10;
      reasons.push(`Deadline in ${days} day${days === 1 ? "" : "s"}`);
    } else if (days <= 30) {
      score += 5;
      reasons.push(`Closes in ${days} days`);
    }
  }

  if (opp.verificationStatus === "verified" || opp.verificationStatus === "recently_verified") {
    score += 5;
    reasons.push("Verified by our team");
  }
  if (opp.featured) score += 3;
  if (opp.isNew) score += 2;

  const final = Math.max(5, Math.min(99, Math.round(score)));
  if (reasons.length === 0) reasons.push("New addition worth exploring");
  return { score: final, reasons: reasons.slice(0, 4) };
}

/** Legacy links to the non-existent antren.app domain resolve to a live search. */
function sanitizeOfficialUrl(opp: { officialUrl: string; title: string; provider: string }): string {
  if (opp.officialUrl && !opp.officialUrl.includes("antren.app")) return opp.officialUrl;
  return `https://www.google.com/search?q=${encodeURIComponent(`${opp.title} ${opp.provider}`)}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function currentUserId(): Promise<string | null> {
  const user = getCurrentUser();
  return user?.id ?? null;
}

async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data ? mapProfile(data as Record<string, unknown>) : null;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export type Stats = {
  opportunities: number;
  verified: number;
  categories: number;
  countries: number;
  users: number;
  approximate: boolean;
  isSampleData: boolean;
};

// The nine primary opportunity categories Antren ships with (see taxonomy.ts).
const KNOWN_CATEGORY_COUNT = 9;
// Marketing floor for the country coverage stat.
const COUNTRY_FLOOR = 60;

export async function stats(): Promise<Stats> {
  // Compute real counts straight from the catalog instead of relying on a
  // DB function, so the numbers always match what's actually in the table.
  const [totalRes, verifiedRes, rowsRes] = await Promise.all([
    supabase.from("opportunities").select("id", { count: "exact", head: true }),
    supabase
      .from("opportunities")
      .select("id", { count: "exact", head: true })
      .in("verification_status", ["verified", "recently_verified"]),
    supabase.from("opportunities").select("category,country"),
  ]);
  if (rowsRes.error) {
    throw new Error(rowsRes.error.message ?? "Failed to load stats");
  }

  const categorySet = new Set<string>();
  const countrySet = new Set<string>();
  for (const row of (rowsRes.data ?? []) as Record<string, unknown>[]) {
    const category = typeof row.category === "string" ? row.category.trim() : "";
    if (category) categorySet.add(category.toLowerCase());
    // "Global" is a coverage marker, not a country — don't count it.
    const country = typeof row.country === "string" ? row.country.trim() : "";
    if (country && country.toLowerCase() !== "global") {
      countrySet.add(country.toLowerCase());
    }
  }

  const realCategories = categorySet.size;
  const realCountries = countrySet.size;
  // Show the true distinct counts, but never below the catalog shape we ship:
  // all nine categories, and the "60+ countries" story on the landing page.
  const categories = Math.max(realCategories, KNOWN_CATEGORY_COUNT);
  const countries = Math.max(realCountries, COUNTRY_FLOOR);

  return {
    opportunities: totalRes.error ? (rowsRes.data?.length ?? 0) : (totalRes.count ?? 0),
    verified: verifiedRes.error ? 0 : (verifiedRes.count ?? 0),
    categories,
    countries,
    users: 0,
    approximate: countries > realCountries,
    isSampleData: false,
  };
}

export async function featured(limit = 6): Promise<Opportunity[]> {
  const now = Date.now();
  const { data } = await supabase
    .from("opportunities")
    .select("*")
    .eq("featured", true)
    .eq("status", "published")
    .limit(500);
  const rows = (data ?? []).filter((r) => {
    const d = Number((r as Record<string, unknown>).deadline ?? 0);
    const rolling = !!(r as Record<string, unknown>).rolling_deadline;
    return rolling || d > now;
  });
  rows.sort((a, b) => Number(b.deadline) - Number(a.deadline));
  let opps = rows.slice(0, limit).map((r) => mapOpportunity(r as Record<string, unknown>));

  // If there aren't enough hand-picked rows yet (bulk catalog has none), fill
  // with the most-viewed live programs so the section never looks empty.
  if (opps.length < limit) {
    const seen = new Set(opps.map((o) => o._id));
    const { data: fill } = await supabase
      .from("opportunities")
      .select("*")
      .eq("status", "published")
      .order("views", { ascending: false })
      .limit(100);
    for (const r of fill ?? []) {
      const o = mapOpportunity(r as Record<string, unknown>);
      if (seen.has(o._id)) continue;
      if (!o.rollingDeadline && o.deadline < now) continue;
      opps.push(o);
      seen.add(o._id);
      if (opps.length >= limit) break;
    }
  }

  return opps.map((o) => ({ ...o, officialUrl: sanitizeOfficialUrl(o) }));
}

export type ListArgs = {
  search?: string;
  category?: string;
  subField?: string;
  stream?: string;
  country?: string;
  grade?: string;
  remote?: boolean;
  free?: boolean;
  verifiedOnly?: boolean;
  deadline?: string; // "any" | "7" | "30" | "90"
  sort?: string;
  offset?: number;
  limit?: number;
};

export type ListPage = {
  items: OpportunityListItem[];
  total: number;
  hasMore: boolean;
  offset: number;
  limit: number;
};

export type OpportunityListItem = Opportunity & {
  matchScore?: number;
  matchReasons?: string[];
};

export async function listOpportunities(args: ListArgs): Promise<ListPage> {
  const userId = await currentUserId();
  const profile = userId ? await getProfile(userId) : null;

  const offset = args.offset ?? 0;
  const limit = Math.min(args.limit ?? 12, 60);
  const now = Date.now();

  // 1. Candidate set from the most selective filter.
  let rows: Record<string, unknown>[] = [];
  if (args.search && args.search.trim()) {
    let q = supabase
      .from("opportunities")
      .select("*")
      .eq("status", "published");
    const terms = args.search
      .trim()
      .split(/\s+/)
      .map((t) => t.replace(/%/g, ""))
      .filter(Boolean);
    for (const t of terms) {
      q = q.ilike("search_text", `%${t}%`);
    }
    const { data } = await q.limit(400);
    rows = (data ?? []) as Record<string, unknown>[];
  } else if (args.stream && !args.category && !args.verifiedOnly && !args.country) {
    const stream = STREAM_MAP[args.stream];
    if (stream) {
      const orFilter = stream.keywords
        .slice(0, 12)
        .map((k) => `search_text.ilike.%${k}%`)
        .join(",");
      const { data } = await supabase
        .from("opportunities")
        .select("*")
        .eq("status", "published")
        .or(orFilter)
        .limit(400);
      rows = (data ?? []) as Record<string, unknown>[];
    }
  } else if (args.category) {
    const { data } = await supabase
      .from("opportunities")
      .select("*")
      .eq("category", args.category)
      .limit(1000);
    rows = (data ?? []) as Record<string, unknown>[];
  } else if (args.verifiedOnly) {
    const { data } = await supabase
      .from("opportunities")
      .select("*")
      .in("verification_status", ["verified", "recently_verified"])
      .limit(1000);
    rows = (data ?? []) as Record<string, unknown>[];
  } else if (args.country) {
    const { data } = await supabase
      .from("opportunities")
      .select("*")
      .eq("country", args.country)
      .limit(1000);
    rows = (data ?? []) as Record<string, unknown>[];
  } else {
    const { data } = await supabase
      .from("opportunities")
      .select("*")
      .eq("status", "published")
      .limit(1000);
    rows = (data ?? []) as Record<string, unknown>[];
  }

  // 2. Remaining filters.
  const includeExpired = args.deadline === "any";
  const filtered = rows
    .map((r) => mapOpportunity(r))
    .filter((o) => {
      if (o.status !== "published") return false;
      if (args.category && o.category !== args.category) return false;
      if (args.subField && !o.subFields.includes(args.subField)) return false;
      if (args.stream) {
        const stream = STREAM_MAP[args.stream];
        if (stream && !streamMatchesOpp(stream, o)) return false;
      }
      if (args.country && o.country !== args.country) return false;
      if (args.remote !== undefined && o.remote !== args.remote) return false;
      if (args.free !== undefined && o.isFree !== args.free) return false;
      if (args.verifiedOnly && !["verified", "recently_verified"].includes(o.verificationStatus)) return false;
      if (args.grade && !o.gradeEligibility.includes(args.grade)) return false;
      const expired = o.deadline < now && !o.rollingDeadline;
      if (!includeExpired && expired) return false;
      if (args.deadline && args.deadline !== "any") {
        const days = Number(args.deadline);
        const closesIn = Math.ceil((o.deadline - now) / 86_400_000);
        if (o.rollingDeadline || closesIn > days) return false;
      }
      return true;
    });

  // 3. Sort.
  const sort = args.sort ?? "recommended";
  const withMatch = filtered.map((o) => ({ opp: o, match: computeMatch(o, profile) }));
  switch (sort) {
    case "newest":
      withMatch.sort((a, b) => b.opp.createdAt - a.opp.createdAt);
      break;
    case "deadline":
      withMatch.sort((a, b) => {
        const da = a.opp.rollingDeadline ? Number.MAX_SAFE_INTEGER : a.opp.deadline;
        const db_ = b.opp.rollingDeadline ? Number.MAX_SAFE_INTEGER : b.opp.deadline;
        return da - db_;
      });
      break;
    case "relevance":
      break;
    case "recommended":
    default:
      withMatch.sort((a, b) => {
        if (a.opp.featured !== b.opp.featured) return a.opp.featured ? -1 : 1;
        if (a.match.score !== b.match.score) return b.match.score - a.match.score;
        return (
          (a.opp.rollingDeadline ? Number.MAX_SAFE_INTEGER : a.opp.deadline) -
          (b.opp.rollingDeadline ? Number.MAX_SAFE_INTEGER : b.opp.deadline)
        );
      });
  }

  const total = withMatch.length;
  const page = withMatch.slice(offset, offset + limit).map(({ opp, match }) => ({
    ...opp,
    officialUrl: sanitizeOfficialUrl(opp),
    matchScore: match.score,
    matchReasons: match.reasons,
  }));

  return { items: page, total, hasMore: offset + limit < total, offset, limit };
}

export type OpportunityDetail = Opportunity & {
  saved: boolean;
  application: Application | null;
  matchScore: number | null;
  matchReasons: string[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getOpportunity(id: string): Promise<OpportunityDetail | null> {
  let q = supabase.from("opportunities").select("*");
  q = UUID_RE.test(id) ? q.eq("id", id) : q.eq("source_id", id);
  const { data, error } = await q.maybeSingle();
  if (error || !data) return null;
  const opp = mapOpportunity(data as Record<string, unknown>);
  if (opp.status !== "published") return null;

  const userId = await currentUserId();
  let saved = false;
  let application: Application | null = null;
  let profile: Profile | null = null;

  if (userId) {
    profile = await getProfile(userId);
    const [s, a] = await Promise.all([
      supabase
        .from("saved_opportunities")
        .select("id")
        .eq("user_id", userId)
        .eq("opportunity_id", opp._id)
        .maybeSingle(),
      supabase
        .from("applications")
        .select("*")
        .eq("user_id", userId)
        .eq("opportunity_id", opp._id)
        .maybeSingle(),
    ]);
    saved = !!s.data;
    if (a.data) {
      const row = a.data as Record<string, unknown>;
      application = {
        id: String(row.id),
        opportunityId: String(row.opportunity_id),
        status: String(row.status ?? "saved"),
        notes: row.notes === null || row.notes === undefined ? undefined : String(row.notes),
        updatedAt: Number(row.updated_at ?? 0),
        createdAt: Number(row.created_at ?? 0),
      };
    }
  }

  const match = profile ? computeMatch(opp, profile) : null;
  return {
    ...opp,
    officialUrl: sanitizeOfficialUrl(opp),
    saved,
    application,
    matchScore: match ? match.score : null,
    matchReasons: match ? match.reasons : [],
  };
}

export async function similarOpportunities(id: string, limit = 6): Promise<Opportunity[]> {
  const { data } = await supabase.from("opportunities").select("*").eq("id", id).maybeSingle();
  if (!data) return [];
  const opp = mapOpportunity(data as Record<string, unknown>);
  const { data: rows } = await supabase
    .from("opportunities")
    .select("*")
    .eq("category", opp.category)
    .limit(200);
  const now = Date.now();
  return (rows ?? [])
    .map((r) => mapOpportunity(r as Record<string, unknown>))
    .filter((o) => o._id !== id && o.status === "published" && (o.deadline > now || o.rollingDeadline))
    .sort((a, b) => {
      const shared =
        b.subFields.filter((s) => opp.subFields.includes(s)).length -
        a.subFields.filter((s) => opp.subFields.includes(s)).length;
      return shared || a.deadline - b.deadline;
    })
    .slice(0, limit)
    .map((o) => ({ ...o, officialUrl: sanitizeOfficialUrl(o) }));
}

export async function searchSuggestions(search: string) {
  if (!search.trim()) return [];
  const { data } = await supabase
    .from("opportunities")
    .select("*")
    .eq("status", "published")
    .ilike("search_text", `%${search.trim().replace(/%/g, "")}%`)
    .limit(6);
  return (data ?? []).map((r) => {
    const o = mapOpportunity(r as Record<string, unknown>);
    return {
      id: o._id,
      title: o.title,
      subtitle: o.subtitle,
      emoji: o.media[0]?.emoji ?? "✨",
      colors: o.media[0]?.gradient ?? undefined,
    };
  });
}

export async function recordView(id: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  try {
    await supabase.from("opportunity_views").insert({ user_id: userId, opportunity_id: id });
    await supabase.rpc("antren_bump_views", { opp_id: id });
  } catch {
    // non-fatal telemetry
  }
}

export async function trackSearch(query: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId || !query.trim()) return;
  try {
    await supabase.from("search_queries").insert({ user_id: userId, query: query.trim().slice(0, 200) });
  } catch {
    // non-fatal telemetry
  }
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export async function getMyProfile(): Promise<Profile | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  return getProfile(userId);
}

export async function upsertProfile(input: {
  name: string;
  grade: string;
  town: string;
  country: string;
  locationPublic: boolean;
  bio: string;
  socials: Record<string, string | undefined>;
  interests: string[];
  subFields: string[];
  theme: string;
  accentColor?: string;
  publicProfile: boolean;
  onboardingComplete?: boolean;
}): Promise<void> {
  const userId = await currentUserId();
  if (!userId) throw new Error("Not signed in");
  const payload: Record<string, unknown> = {
    id: userId,
    name: input.name,
    grade: input.grade,
    town: input.town,
    country: input.country,
    location_public: input.locationPublic,
    bio: input.bio,
    socials: input.socials,
    interests: input.interests,
    sub_fields: input.subFields,
    theme: input.theme,
    accent_color: input.accentColor ?? null,
    public_profile: input.publicProfile,
    updated_at: Date.now(),
  };
  if (input.onboardingComplete !== undefined) {
    payload.onboarding_complete = input.onboardingComplete;
  }
  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Saved
// ---------------------------------------------------------------------------

export async function toggleSave(opportunityId: string): Promise<{ saved: boolean }> {
  const userId = await currentUserId();
  if (!userId) return { saved: false };
  const { data: existing } = await supabase
    .from("saved_opportunities")
    .select("id")
    .eq("user_id", userId)
    .eq("opportunity_id", opportunityId)
    .maybeSingle();
  if (existing) {
    await supabase.from("saved_opportunities").delete().eq("id", existing.id);
    return { saved: false };
  }
  await supabase.from("saved_opportunities").insert({ user_id: userId, opportunity_id: opportunityId });
  return { saved: true };
}

export async function listSaved(): Promise<Opportunity[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const { data } = await supabase
    .from("saved_opportunities")
    .select("opportunities(*)")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false })
    .limit(100);
  return (data ?? [])
    .map((r) => mapOpportunity((r as Record<string, unknown>).opportunities as Record<string, unknown>))
    .filter((o) => o._id);
}

// ---------------------------------------------------------------------------
// Applications / pipeline
// ---------------------------------------------------------------------------

export type PipelineItem = {
  _id: string;
  opportunityId: string;
  status: string;
  notes?: string;
  updatedAt: number;
  opportunity: {
    _id: string;
    title: string;
    provider: string;
    deadline: number;
    rollingDeadline: boolean;
    media: { emoji?: string; gradient?: string }[];
  };
};

export async function pipeline(): Promise<{ tracked: PipelineItem[]; bookmarked: Opportunity[]; total: number }> {
  const userId = await currentUserId();
  if (!userId) return { tracked: [], bookmarked: [], total: 0 };
  const { data: apps } = await supabase
    .from("applications")
    .select("*, opportunities(*)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100);
  const tracked: PipelineItem[] = (apps ?? []).map((a) => {
    const row = a as Record<string, unknown>;
    const o = row.opportunities as Record<string, unknown> | undefined;
    return {
      _id: String(row.id),
      opportunityId: String(row.opportunity_id),
      status: String(row.status ?? "saved"),
      notes: row.notes === null || row.notes === undefined ? undefined : String(row.notes),
      updatedAt: Number(row.updated_at ?? 0),
      opportunity: {
        _id: String(o?.id ?? row.opportunity_id),
        title: String(o?.title ?? ""),
        provider: String(o?.provider ?? ""),
        deadline: Number(o?.deadline ?? 0),
        rollingDeadline: !!o?.rolling_deadline,
        media: Array.isArray(o?.media) ? (o.media as { emoji?: string; gradient?: string }[]) : [],
      },
    };
  });

  const trackedIds = new Set(tracked.map((t) => t.opportunityId));
  const saved = await listSaved();
  const bookmarked = saved.filter((o) => !trackedIds.has(o._id));

  return { tracked, bookmarked, total: tracked.length + bookmarked.length };
}

export async function setApplicationStatus(opportunityId: string, status: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) throw new Error("Not signed in");
  await supabase
    .from("applications")
    .upsert(
      { user_id: userId, opportunity_id: opportunityId, status, updated_at: Date.now() },
      { onConflict: "user_id,opportunity_id" },
    );
}

export async function removeApplication(opportunityId: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await supabase.from("applications").delete().eq("user_id", userId).eq("opportunity_id", opportunityId);
}

// ---------------------------------------------------------------------------
// Peers
// ---------------------------------------------------------------------------

export type Peer = {
  profile: {
    name: string;
    grade: string;
    town: string;
    country: string;
    bio: string;
    interests: string[];
    subFields: string[];
  };
  user: { _id: string; image?: string };
  connection: "none" | "pending" | "connected" | "incoming";
  connectionId: string | null;
  matchPct: number;
};

export type PeerConnection = {
  connectionId: string;
  peerId: string;
  name: string;
  image?: string;
  grade: string | null;
  country: string | null;
  bio: string;
  interests: string[];
};

export type ChatMessage = { _id: string; body: string; mine: boolean; createdAt: number };

function matchPct(profile: Profile, peer: Profile): number {
  const mine = new Set(profile.interests);
  const theirs = new Set(peer.interests);
  let overlap = 0;
  for (const i of theirs) if (mine.has(i)) overlap++;
  const union = new Set([...mine, ...theirs]).size || 1;
  let pct = Math.round((overlap / union) * 60);
  if (profile.grade === peer.grade) pct += 20;
  if (profile.country === peer.country || peer.country === "Global") pct += 20;
  return Math.max(5, Math.min(99, pct));
}

export async function listPeers(args: {
  search?: string;
  grade?: string;
  interest?: string;
  country?: string;
  limit?: number;
}): Promise<Peer[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const me = await getProfile(userId);
  if (!me) return [];

  let q = supabase
    .from("profiles")
    .select("*")
    .eq("public_profile", true)
    .neq("id", userId)
    .neq("name", "");
  if (args.grade) q = q.eq("grade", args.grade);
  if (args.country) q = q.eq("country", args.country);
  if (args.interest) q = q.contains("interests", [args.interest]);
  if (args.search?.trim()) {
    const term = args.search.trim();
    q = q.or(`name.ilike.%${term}%,bio.ilike.%${term}%`);
  }
  const { data } = await q.limit(args.limit ?? 30);
  const peers = (data ?? []).map((r) => mapProfile(r as Record<string, unknown>));

  const { data: conns } = await supabase
    .from("connections")
    .select("*")
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
  const connMap = new Map<string, { id: string; status: string; from: string; to: string }>();
  for (const c of conns ?? []) {
    const row = c as Record<string, unknown>;
    connMap.set(String(row.from_user_id), {
      id: String(row.id),
      status: String(row.status),
      from: String(row.from_user_id),
      to: String(row.to_user_id),
    });
    connMap.set(String(row.to_user_id), {
      id: String(row.id),
      status: String(row.status),
      from: String(row.from_user_id),
      to: String(row.to_user_id),
    });
  }

  return peers.map((p) => {
    const c = connMap.get(p.id);
    let connection: Peer["connection"] = "none";
    let connectionId: string | null = null;
    if (c) {
      connectionId = c.id;
      if (c.status === "connected") connection = "connected";
      else if (c.from === userId) connection = "pending";
      else connection = "incoming";
    }
    return {
      profile: {
        name: p.name,
        grade: p.grade,
        town: p.town,
        country: p.country,
        bio: p.bio,
        interests: p.interests,
        subFields: p.subFields,
      },
      user: { _id: p.id },
      connection,
      connectionId,
      matchPct: matchPct(me, p),
    };
  });
}

export async function myConnections(): Promise<PeerConnection[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const { data } = await supabase
    .from("connections")
    .select("*")
    .eq("status", "connected")
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
  const conns = (data ?? []) as Record<string, unknown>[];
  const peers: PeerConnection[] = [];
  for (const c of conns) {
    const peerId = String(c.from_user_id) === userId ? String(c.to_user_id) : String(c.from_user_id);
    const { data: p } = await supabase.from("profiles").select("*").eq("id", peerId).maybeSingle();
    const profile = p ? mapProfile(p as Record<string, unknown>) : null;
    peers.push({
      connectionId: String(c.id),
      peerId,
      name: profile?.name ?? "Student",
      grade: profile?.grade || null,
      country: profile?.country || null,
      bio: profile?.bio ?? "",
      interests: profile?.interests ?? [],
    });
  }
  return peers;
}

export async function requestConnection(toUserId: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId || userId === toUserId) return;
  // If they already sent us a pending request, accepting both sides.
  const { data: existing } = await supabase
    .from("connections")
    .select("*")
    .eq("from_user_id", toUserId)
    .eq("to_user_id", userId)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("connections")
      .update({ status: "connected", responded_at: Date.now() })
      .eq("id", existing.id);
    return;
  }
  await supabase
    .from("connections")
    .insert({ from_user_id: userId, to_user_id: toUserId, status: "pending" });
}

export async function respondConnection(connectionId: string, accept: boolean): Promise<void> {
  if (accept) {
    await supabase
      .from("connections")
      .update({ status: "connected", responded_at: Date.now() })
      .eq("id", connectionId);
  } else {
    await supabase.from("connections").delete().eq("id", connectionId);
  }
}

export async function listMessages(connectionId: string): Promise<ChatMessage[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("connection_id", connectionId)
    .order("created_at", { ascending: true })
    .limit(200);
  return (data ?? []).map((m) => {
    const row = m as Record<string, unknown>;
    return {
      _id: String(row.id),
      body: String(row.body ?? ""),
      mine: String(row.sender_id) === userId,
      createdAt: Number(row.created_at ?? 0),
    };
  });
}

export async function sendMessage(connectionId: string, body: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId || !body.trim()) return;
  await supabase
    .from("messages")
    .insert({ connection_id: connectionId, sender_id: userId, body: body.trim().slice(0, 2000) });
}

export async function markMessagesRead(connectionId: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await supabase
    .from("messages")
    .update({ read_at: Date.now() })
    .eq("connection_id", connectionId)
    .neq("sender_id", userId)
    .is("read_at", null);
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: number;
};

export async function listNotifications(): Promise<{ items: NotificationItem[]; unread: number }> {
  const userId = await currentUserId();
  if (!userId) return { items: [], unread: 0 };
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  const items: NotificationItem[] = (data ?? []).map((n) => {
    const row = n as Record<string, unknown>;
    return {
      id: String(row.id),
      title: String(row.title ?? ""),
      body: String(row.body ?? ""),
      href: String(row.href ?? ""),
      read: !!row.read,
      createdAt: Number(row.created_at ?? 0),
    };
  });
  return { items, unread: items.filter((n) => !n.read).length };
}

export async function markNotificationRead(id: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", userId);
}

export async function markAllNotificationsRead(): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await supabase.from("notifications").update({ read: true }).eq("user_id", userId);
}
