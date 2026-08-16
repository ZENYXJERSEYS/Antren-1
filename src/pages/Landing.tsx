import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, CheckCircle2, Globe2, Sparkles, Users } from "lucide-react";
import { lazy, Suspense } from "react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/use-auth";
import { useSeedData } from "@/hooks/use-seed";
import { CATEGORIES } from "@/lib/taxonomy";
import { daysUntil, deadlineLabel } from "@/lib/format";
import { useQuery } from "convex/react";

const HeroScene = lazy(() => import("@/components/HeroScene"));

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function Nav() {
  const { isAuthenticated, isLoading } = useAuth();
  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link to="/" aria-label="Antren home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          <a href="#categories" className="transition-colors hover:text-foreground">Opportunities</a>
          <a href="#featured" className="transition-colors hover:text-foreground">Featured</a>
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
        </nav>
        <div className="flex items-center gap-2">
          {isLoading ? null : isAuthenticated ? (
            <Link to="/app/for-you">
              <Button size="sm" className="gap-1.5">
                Open app <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/auth" className="hidden sm:block">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="gap-1.5">
                  Get started <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const stats = useQuery(api.opportunities.stats);
  const plus = stats?.approximate ? "+" : "";
  const items = [
    { value: stats ? `${stats.opportunities.toLocaleString()}${plus}` : "—", label: "Live opportunities" },
    { value: stats ? `${stats.categories}` : "—", label: "Categories" },
    { value: stats ? `${stats.countries}` : "—", label: "Countries" },
    { value: stats ? `${stats.verified.toLocaleString()}${plus}` : "—", label: "Verified by our team" },
  ];
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      <Suspense fallback={null}>
        <HeroScene />
      </Suspense>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50rem_30rem_at_18%_-10%,color-mix(in_oklab,var(--primary)_9%,transparent),transparent_60%)]" />
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show" className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            Opportunities without limits
          </span>
          <h1 className="mt-6 text-balance text-[2.6rem] leading-[1.05] font-semibold tracking-tight sm:text-6xl md:text-[4.25rem]">
            Every door worth opening,{" "}
            <span className="text-primary">found for you.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Antren curates scholarships, internships, competitions, fellowships and programs
            from around the world — verified, personalized, and organized into a pipeline
            that turns ambition into acceptances.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="gap-2 rounded-full px-7">
                Build your profile <ArrowRight className="size-4" />
              </Button>
            </Link>
            <a href="#featured">
              <Button size="lg" variant="outline" className="gap-2 rounded-full px-7">
                Explore opportunities
              </Button>
            </a>
          </div>
        </motion.div>

        <motion.dl
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border/60 sm:grid-cols-4"
        >
          {items.map((it) => (
            <div key={it.label} className="bg-card px-6 py-5 text-center">
              <dt className="order-2 mt-1 text-xs font-medium text-muted-foreground">{it.label}</dt>
              <dd className="order-1 text-2xl font-semibold tracking-tight text-foreground">{it.value}</dd>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}

function Providers() {
  const names = ["Google", "NASA", "MIT", "Stanford", "Yale", "Harvard", "NYT", "UN", "Oxford", "Intel"];
  return (
    <section className="border-y bg-secondary/40 py-8">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Programs from the world&apos;s most ambitious institutions
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-9 gap-y-3 opacity-70">
          {names.map((n) => (
            <span key={n} className="text-sm font-semibold tracking-tight text-foreground/70">
              {n}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Categories() {
  return (
    <section id="categories" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Browse by category</p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Nine paths. Every ambition.
          </h2>
        </motion.div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((c, i) => (
            <motion.div
              key={c.slug}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: (i % 5) * 0.05, duration: 0.45 }}
            >
              <Link
                to={`/auth?returnTo=/app/explore?category=${c.slug}`}
                className="group flex h-full flex-col gap-3 rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
              >
                <span className="text-2xl">{c.emoji}</span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">{c.label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground line-clamp-1">
                    {c.subfields.slice(0, 3).join(" · ")}
                  </span>
                </span>
                <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Explore <ArrowRight className="size-3" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Featured() {
  const featured = useQuery(api.opportunities.featured, { limit: 3 });
  return (
    <section id="featured" className="bg-secondary/40 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Hand-picked</p>
            <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
              This week&apos;s most-watched programs
            </h2>
          </div>
          <Link to="/auth?returnTo=/app/explore">
            <Button variant="outline" className="gap-1.5 rounded-full">
              See all <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {!featured &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl border bg-card" />
            ))}
          {featured?.map((o, i) => {
            const cover = o.media[0];
            const days = daysUntil(o.deadline, o.rollingDeadline);
            return (
              <motion.div
                key={o._id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              >
                <Link
                  to={`/auth?returnTo=/app/opportunity/${o._id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-1 hover:shadow-[0_18px_44px_-18px_rgba(0,0,0,0.25)]"
                >
                  <div
                    className="relative flex h-36 items-center justify-center overflow-hidden"
                    style={{ background: cover?.gradient ?? "linear-gradient(135deg,#10B981,#059669)" }}
                  >
                    <span className="text-5xl drop-shadow-sm transition-transform duration-300 group-hover:scale-110">
                      {cover?.emoji ?? "✨"}
                    </span>
                    <span className="absolute top-3 left-3 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                      {o.provider}
                    </span>
                    {o.verificationStatus === "verified" && (
                      <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                        <BadgeCheck className="size-3" /> Verified
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                      <span>{days !== null && days >= 0 ? deadlineLabel(o.deadline, o.rollingDeadline) : "Rolling"}</span>
                      {days !== null && days <= 7 && days >= 0 && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700">Closing soon</span>
                      )}
                    </div>
                    <h3 className="text-[15px] font-semibold leading-snug text-foreground">{o.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{o.shortDescription}</p>
                    <span className="mt-auto inline-flex items-center gap-1 pt-2 text-xs font-semibold text-primary">
                      View program <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Users,
      title: "Build your profile",
      body: "Share your grade, location, interests and fields — a two-minute setup that powers every recommendation.",
    },
    {
      icon: Sparkles,
      title: "Get matched",
      body: "A personalization engine scores thousands of opportunities against who you are, surfacing the ones actually worth your time.",
    },
    {
      icon: CheckCircle2,
      title: "Apply with confidence",
      body: "Track every application through a clean pipeline, get deadline reminders, and connect with peers on the same path.",
    },
  ];
  return (
    <section id="how" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">How Antren works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            From curious student to standout applicant
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative rounded-2xl border bg-card p-7"
            >
              <span className="absolute top-6 right-6 text-4xl font-semibold text-border select-none">
                0{i + 1}
              </span>
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="px-5 pb-24 sm:px-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-emerald-300/20 bg-[#14100e] px-6 py-16 text-center text-[#faf6f1] sm:px-12 sm:py-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-medium text-emerald-300">
          <Globe2 className="size-3.5" /> Free for students, everywhere
        </span>
        <h2 className="mx-auto mt-6 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
          Your next big opportunity is already out there.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-[15px] leading-relaxed text-[#b3a596]">
          Join students from 40+ countries discovering programs they never knew existed.
          Set up your profile in minutes — no paywall, ever.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="gap-2 rounded-full bg-emerald-500 px-8 text-emerald-950 hover:bg-emerald-400">
              Start free <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link to="/auth?returnTo=/app/explore">
            <Button
              size="lg"
              variant="outline"
              className="gap-2 rounded-full border-white/20 px-8 text-[#faf6f1] hover:bg-white/10 hover:text-white"
            >
              Browse first
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-secondary/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row sm:px-8">
        <Logo />
        <p className="text-sm text-muted-foreground">
          Opportunities without limits. <span className="text-foreground/70">Made for curious minds.</span>
        </p>
        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          <Link to="/auth" className="transition-colors hover:text-foreground">Sign in</Link>
          <span aria-hidden="true">·</span>
          <Link to="/auth?returnTo=/app/explore" className="transition-colors hover:text-foreground">
            Explore
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  useSeedData();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <Nav />
      <main>
        <Hero />
        <Providers />
        <Categories />
        <Featured />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </motion.div>
  );
}
