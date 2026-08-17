import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  Clock,
  Coins,
  ExternalLink,
  Globe2,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OpportunityCard } from "@/components/OpportunityCard";
import { getOpportunity, recordView, setApplicationStatus, similarOpportunities, toggleSave, useDb } from "@/lib/db";
import { CATEGORY_MAP, PIPELINE_STAGES, REJECTED_STAGE } from "@/lib/taxonomy";
import { deadlineLabel, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const opp = useDb(() => (id ? getOpportunity(id) : Promise.resolve(null)), [id]);
  const similar = useDb(() => (id ? similarOpportunities(id, 3) : Promise.resolve([])), [id]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (id) void recordView(id);
  }, [id]);

  useEffect(() => {
    setSaved(!!opp?.saved);
  }, [opp?.saved]);

  if (!opp) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Loading opportunity…</div>
      </div>
    );
  }

  const cover = opp.media[0];
  const category = CATEGORY_MAP[opp.category];
  const stages = [...PIPELINE_STAGES, REJECTED_STAGE];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div
          className="relative flex h-56 items-center justify-center overflow-hidden rounded-3xl border sm:h-64"
          style={{ background: cover?.gradient ?? "linear-gradient(135deg,#10B981,#059669)" }}
        >
          <span className="text-7xl drop-shadow-md">{cover?.emoji ?? "✨"}</span>
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            {opp.verificationStatus === "verified" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-emerald-700 backdrop-blur">
                <BadgeCheck className="size-3.5" /> Verified by our team
              </span>
            )}
            {opp.isNew && (
              <span className="rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
                New addition
              </span>
            )}
          </div>
          <span className="absolute right-4 bottom-4 rounded-full bg-black/30 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            {opp.views.toLocaleString()} views
          </span>
        </div>

        <div className="mt-7 grid gap-10 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
              <Link
                to={`/app/explore?category=${opp.category}`}
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors hover:border-primary/40 hover:text-primary"
              >
                {category?.emoji} {category?.label}
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1">
                <Globe2 className="size-3.5" /> {opp.country}
              </span>
              {opp.remote && (
                <span className="rounded-full border px-2.5 py-1">Remote</span>
              )}
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{opp.title}</h1>
            <p className="mt-2 text-base text-muted-foreground">{opp.subtitle}</p>
            <p className="mt-1 text-sm font-medium">by {opp.provider}</p>

            <div className="mt-6 rounded-2xl border bg-card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">About this program</h2>
              <p className="mt-3 text-[15px] leading-relaxed">{opp.description}</p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border bg-card p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Eligibility</h3>
                <p className="mt-2 text-sm leading-relaxed">{opp.eligibility}</p>
              </div>
              <div className="rounded-2xl border bg-card p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Application method</h3>
                <p className="mt-2 text-sm leading-relaxed">{opp.applicationMethod}</p>
              </div>
            </div>

            {opp.requiredDocuments.length > 0 && (
              <div className="mt-6 rounded-2xl border bg-card p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  What you&apos;ll need
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {opp.requiredDocuments.map((d) => (
                    <span key={d} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              {opp.subFields.map((s) => (
                <span key={s} className="rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                  {s}
                </span>
              ))}
            </div>

            {similar && similar.length > 0 && (
              <div className="mt-12">
                <h2 className="text-xl font-semibold tracking-tight">Similar programs</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {similar.map((s) => (
                    <OpportunityCard key={s._id.toString()} opp={s as never} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-2">
                <Button asChild className="flex-1 gap-2">
                  <a href={opp.officialUrl} target="_blank" rel="noopener noreferrer">
                    Apply now <ExternalLink className="size-4" />
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn("size-10 shrink-0", saved && "text-primary")}
                  onClick={() => {
                    void toggleSave(opp._id).then((res) => setSaved(res.saved));
                  }}
                  aria-label={saved ? "Remove bookmark" : "Bookmark"}
                >
                  <Bookmark className={cn("size-4", saved && "fill-current")} />
                </Button>
              </div>

              {opp.application ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" className="mt-2.5 w-full gap-2">
                      {stages.find((s) => s.value === opp.application!.status)?.emoji}{" "}
                      {stages.find((s) => s.value === opp.application!.status)?.label}
                      <ArrowUpRight className="size-4 rotate-90" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-full min-w-52">
                    {stages.map((s) => (
                      <DropdownMenuItem
                        key={s.value}
                        className={cn("cursor-pointer", s.value === opp.application!.status && "bg-primary/10 text-primary")}
                        onClick={() => void setApplicationStatus(opp._id, s.value)}
                      >
                        {s.emoji} {s.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="secondary"
                  className="mt-2.5 w-full gap-2"
                  onClick={() => void setApplicationStatus(opp._id, "saved")}
                >
                  <Sparkles className="size-4" /> Track in pipeline
                </Button>
              )}

              <dl className="mt-5 flex flex-col gap-4 text-sm">
                <div className="flex items-center gap-3">
                  <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Deadline</dt>
                    <dd className="font-medium">
                      {opp.rollingDeadline ? "Rolling" : formatDate(opp.deadline)}{" "}
                      <span className={cn("text-xs", !opp.rollingDeadline && opp.deadline < Date.now() + 8 * 86_400_000 && "font-semibold text-amber-700")}>
                        {deadlineLabel(opp.deadline, opp.rollingDeadline)}
                      </span>
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Duration</dt>
                    <dd className="font-medium">{opp.duration}</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Location</dt>
                    <dd className="font-medium">{opp.remote ? "Remote" : opp.location}</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Coins className="size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Cost & support</dt>
                    <dd className="font-medium">{opp.isFree ? "Free" : opp.stipendText}</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Verification</dt>
                    <dd className="font-medium capitalize">
                      {opp.verificationStatus.replace("_", " ")}
                      {opp.verificationNote && <span className="block text-xs font-normal text-muted-foreground">{opp.verificationNote}</span>}
                    </dd>
                  </div>
                </div>
              </dl>

              {typeof opp.matchScore === "number" && (
                <div className="mt-5 rounded-xl bg-primary/8 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {opp.matchScore}% match for you
                  </p>
                  <ul className="mt-2 flex flex-col gap-1">
                    {opp.matchReasons.slice(0, 4).map((r) => (
                      <li key={r} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <BadgeCheck className="mt-0.5 size-3 shrink-0 text-primary" /> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                Deadline and details were last verified on{" "}
                {opp.lastVerifiedAt ? formatDate(opp.lastVerifiedAt) : "the listing date"}.
                Always confirm on the official page before applying.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
