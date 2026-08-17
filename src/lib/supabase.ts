import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase is Antren's backend: Postgres catalog + auth + row-level security.
 * The client is configured from build-time env vars (set in the Keys tab):
 *   VITE_SUPABASE_URL       — https://<ref>.supabase.co
 *   VITE_SUPABASE_ANON_KEY  — public anon key (safe for the browser)
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  console.error(
    "[Antren] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not configured — add them in the Keys tab.",
  );
}

export const supabase: SupabaseClient = createClient(url ?? "", anonKey ?? "");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OpportunityMedia = {
  type: string;
  url: string;
  posterUrl?: string;
  emoji?: string;
  gradient?: string;
};

/** The opportunity shape the UI consumes (camelCase + `_id`). */
export type Opportunity = {
  _id: string;
  id: string;
  _creationTime: number;
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
  stipendText: string;
  deadline: number;
  rollingDeadline: boolean;
  duration: string;
  applicationMethod: string;
  requiredDocuments: string[];
  verificationStatus: string;
  lastVerifiedAt?: number;
  verificationNote: string;
  status: string;
  media: OpportunityMedia[];
  tags: string[];
  featured: boolean;
  isNew: boolean;
  views: number;
  createdAt: number;
  updatedAt: number;
  searchText: string;
  sourceId?: string;
};

export type Profile = {
  id: string;
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
  onboardingComplete: boolean;
  createdAt: number;
  updatedAt: number;
};

export type CurrentUser = {
  _id: string;
  name: string;
  email?: string;
  image?: string;
  role?: string;
};

export type Application = {
  id: string;
  opportunityId: string;
  status: string;
  notes?: string;
  updatedAt: number;
  createdAt: number;
};

/** Raw snake_case row returned by PostgREST. */
type OpportunityRow = Record<string, unknown>;

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function asNumber(v: unknown): number {
  return typeof v === "number" ? v : Number(v ?? 0) || 0;
}
function asBool(v: unknown): boolean {
  return !!v;
}
function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function asAnyArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export function mapOpportunity(row: OpportunityRow): Opportunity {
  return {
    _id: asString(row.id),
    id: asString(row.id),
    _creationTime: asNumber(row.created_at),
    title: asString(row.title),
    subtitle: asString(row.subtitle),
    description: asString(row.description),
    shortDescription: asString(row.short_description),
    provider: asString(row.provider),
    officialUrl: asString(row.official_url),
    category: asString(row.category),
    subFields: asStringArray(row.sub_fields),
    location: asString(row.location),
    country: asString(row.country),
    remote: asBool(row.remote),
    eligibility: asString(row.eligibility),
    gradeEligibility: asStringArray(row.grade_eligibility),
    collegeOnly: asBool(row.college_only),
    cost: row.cost === null || row.cost === undefined ? undefined : asNumber(row.cost),
    isFree: asBool(row.is_free),
    currency: asString(row.currency),
    stipendText: asString(row.stipend_text),
    deadline: asNumber(row.deadline),
    rollingDeadline: asBool(row.rolling_deadline),
    duration: asString(row.duration),
    applicationMethod: asString(row.application_method),
    requiredDocuments: asStringArray(row.required_documents),
    verificationStatus: asString(row.verification_status),
    lastVerifiedAt: row.last_verified_at === null || row.last_verified_at === undefined
      ? undefined
      : asNumber(row.last_verified_at),
    verificationNote: asString(row.verification_note),
    status: asString(row.status),
    media: asAnyArray(row.media) as OpportunityMedia[],
    tags: asStringArray(row.tags),
    featured: asBool(row.featured),
    isNew: asBool(row.is_new),
    views: asNumber(row.views),
    createdAt: asNumber(row.created_at),
    updatedAt: asNumber(row.updated_at),
    searchText: asString(row.search_text),
    sourceId: row.source_id === null || row.source_id === undefined ? undefined : asString(row.source_id),
  };
}

export function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: asString(row.id),
    name: asString(row.name),
    grade: asString(row.grade),
    town: asString(row.town),
    country: asString(row.country),
    locationPublic: asBool(row.location_public),
    bio: asString(row.bio),
    socials: (row.socials && typeof row.socials === "object" ? row.socials : {}) as Record<string, string | undefined>,
    interests: asStringArray(row.interests),
    subFields: asStringArray(row.sub_fields),
    theme: asString(row.theme),
    accentColor: row.accent_color === null || row.accent_color === undefined ? undefined : asString(row.accent_color),
    publicProfile: asBool(row.public_profile),
    onboardingComplete: asBool(row.onboarding_complete),
    createdAt: asNumber(row.created_at),
    updatedAt: asNumber(row.updated_at),
  };
}
