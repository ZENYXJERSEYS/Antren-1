import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACCENTS,
  CATEGORIES,
  COUNTRIES,
  DOMAINS,
  GRADES,
  SOCIAL_LABELS,
  THEMES,
  type ThemeName,
} from "@/lib/taxonomy";
import { applyTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export type ProfileDraft = {
  name: string;
  grade: string;
  town: string;
  country: string;
  locationPublic: boolean;
  bio: string;
  socials: {
    instagram?: string;
    tiktok?: string;
    linkedin?: string;
    github?: string;
    twitter?: string;
    email?: string;
  };
  interests: string[];
  subFields: string[];
  theme: ThemeName;
  accentColor: string;
  publicProfile: boolean;
};

export function emptyDraft(): ProfileDraft {
  return {
    name: "",
    grade: "10",
    town: "",
    country: "Global",
    locationPublic: false,
    bio: "",
    socials: {},
    interests: [],
    subFields: [],
    theme: "light",
    accentColor: ACCENTS[0].color,
    publicProfile: true,
  };
}

export function draftFromProfile(p: {
  name: string;
  grade: string;
  town: string;
  country: string;
  locationPublic: boolean;
  bio: string;
  socials: ProfileDraft["socials"];
  interests: string[];
  subFields: string[];
  theme: string;
  accentColor?: string;
  publicProfile: boolean;
}): ProfileDraft {
  return {
    name: p.name,
    grade: p.grade,
    town: p.town,
    country: p.country,
    locationPublic: p.locationPublic,
    bio: p.bio,
    socials: p.socials,
    interests: p.interests,
    subFields: p.subFields,
    theme: (p.theme as ThemeName) ?? "light",
    accentColor: p.accentColor ?? ACCENTS[0].color,
    publicProfile: p.publicProfile,
  };
}

const SOCIAL_KEYS = ["instagram", "tiktok", "linkedin", "github", "twitter", "email"] as const;

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function ProfileForm({
  initial,
  submitLabel = "Save changes",
  completeOnboarding = false,
  onSaved,
}: {
  initial: ProfileDraft | null;
  submitLabel?: string;
  /** Marks the profile onboarding as complete on save. */
  completeOnboarding?: boolean;
  onSaved?: () => void;
}) {
  const upsert = useMutation(api.profiles.upsert);
  const [draft, setDraft] = useState<ProfileDraft>(initial ?? emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) setDraft(initial);
  }, [initial]);

  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleInterest = (slug: string) =>
    setDraft((d) => ({
      ...d,
      interests: d.interests.includes(slug)
        ? d.interests.filter((i) => i !== slug)
        : d.interests.length < 8
          ? [...d.interests, slug]
          : d.interests,
    }));

  const toggleField = (field: string) =>
    setDraft((d) => ({
      ...d,
      subFields: d.subFields.includes(field)
        ? d.subFields.filter((f) => f !== field)
        : [...d.subFields, field],
    }));

  const setTheme = (theme: ThemeName) => {
    set("theme", theme);
    applyTheme(theme, draft.accentColor);
  };

  const setAccent = (color: string) => {
    set("accentColor", color);
    if (draft.theme === "custom") applyTheme("custom", color);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await upsert({
        name: draft.name.trim(),
        grade: draft.grade,
        town: draft.town.trim(),
        country: draft.country,
        locationPublic: draft.locationPublic,
        bio: draft.bio.trim(),
        socials: {
          instagram: draft.socials.instagram?.trim() || undefined,
          tiktok: draft.socials.tiktok?.trim() || undefined,
          linkedin: draft.socials.linkedin?.trim() || undefined,
          github: draft.socials.github?.trim() || undefined,
          twitter: draft.socials.twitter?.trim() || undefined,
          email: draft.socials.email?.trim() || undefined,
        },
        interests: draft.interests,
        subFields: draft.subFields,
        theme: draft.theme,
        accentColor: draft.theme === "custom" ? draft.accentColor : undefined,
        publicProfile: draft.publicProfile,
        onboardingComplete: completeOnboarding ? true : undefined,
      });
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* Basics */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Basics</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pf-name">Full name</Label>
            <Input id="pf-name" value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Alex Chen" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pf-grade">Grade</Label>
            <Select value={draft.grade} onValueChange={(v) => set("grade", v)}>
              <SelectTrigger id="pf-grade"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GRADES.map((g) => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pf-town">Town / city</Label>
            <Input id="pf-town" value={draft.town} onChange={(e) => set("town", e.target.value)} placeholder="e.g. Austin, TX" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pf-country">Country</Label>
            <Select value={draft.country} onValueChange={(v) => set("country", v)}>
              <SelectTrigger id="pf-country"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-80">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Label htmlFor="pf-bio">Bio</Label>
          <Textarea
            id="pf-bio"
            value={draft.bio}
            onChange={(e) => set("bio", e.target.value)}
            placeholder="Tell people what you're working on…"
            rows={3}
            maxLength={280}
          />
          <p className="text-xs text-muted-foreground">{draft.bio.length}/280</p>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Switch id="pf-loc" checked={draft.locationPublic} onCheckedChange={(v) => set("locationPublic", v)} />
            <Label htmlFor="pf-loc">Show my location on my public profile</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="pf-pub" checked={draft.publicProfile} onCheckedChange={(v) => set("publicProfile", v)} />
            <Label htmlFor="pf-pub">Make my profile public to peers</Label>
          </div>
        </div>
      </section>

      {/* Socials */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Social links</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {SOCIAL_KEYS.map((key) => (
            <div key={key} className="flex flex-col gap-2">
              <Label htmlFor={`pf-${key}`}>{SOCIAL_LABELS[key]}</Label>
              <Input
                id={`pf-${key}`}
                value={draft.socials[key] ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, socials: { ...d.socials, [key]: e.target.value } }))
                }
                placeholder={key === "email" ? "handle@gmail.com" : `@${key}`}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Interests */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Interests <span className="normal-case text-muted-foreground/70">· up to 8</span>
        </h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip key={c.slug} active={draft.interests.includes(c.slug)} onClick={() => toggleInterest(c.slug)}>
              {c.emoji} {c.label}
            </Chip>
          ))}
        </div>
      </section>

      {/* Fields */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Fields you work in
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick the sub-fields that match your work — these drive match scores.
        </p>
        <div className="mt-4 flex max-h-80 flex-col gap-5 overflow-y-auto rounded-2xl border bg-card p-4">
          {DOMAINS.map((domain) => (
            <div key={domain.slug}>
              <p className="text-xs font-semibold text-muted-foreground">{domain.label}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {domain.fields.map((f) => (
                  <Chip key={f} active={draft.subFields.includes(f)} onClick={() => toggleField(f)}>
                    {f}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Theme */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Theme</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                draft.theme === t.value ? "border-primary bg-primary/8" : "border-border hover:border-primary/40",
              )}
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full border"
                style={{
                  background:
                    t.value === "dark"
                      ? "#1c1614"
                      : t.value === "espresso"
                        ? "linear-gradient(135deg,#1c1614,#2d221e)"
                        : t.value === "custom"
                          ? draft.accentColor
                          : "linear-gradient(135deg,#faf8f5,#e7e0d7)",
                  borderColor: t.value === "custom" ? "transparent" : undefined,
                }}
              >
                <span
                  className="size-3 rounded-full"
                  style={{ background: t.value === "custom" ? "#fff" : "#10b981" }}
                />
              </span>
              <span>
                <span className="block text-sm font-semibold">{t.label}</span>
                <span className="block text-xs text-muted-foreground">{t.description}</span>
              </span>
            </button>
          ))}
        </div>
        {draft.theme === "custom" && (
          <div className="mt-4 flex flex-wrap gap-3">
            {ACCENTS.map((a) => (
              <button
                key={a.name}
                type="button"
                aria-label={a.name}
                title={a.name}
                onClick={() => setAccent(a.color)}
                className={cn(
                  "size-9 rounded-full border-2 transition-transform",
                  draft.accentColor === a.color ? "scale-110 border-foreground" : "border-transparent hover:scale-105",
                )}
                style={{ background: a.color }}
              />
            ))}
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" className="gap-2" disabled={saving || !draft.name.trim()}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {submitLabel}
        </Button>
        <p className="text-xs text-muted-foreground">Your interests power every recommendation.</p>
      </div>
    </form>
  );
}
