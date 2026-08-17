import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ProfileForm, draftFromProfile, emptyDraft } from "@/components/ProfileForm";
import { useAuth } from "@/hooks/use-auth";
import { useProfileTheme } from "@/hooks/use-theme";
import { getMyProfile, upsertProfile, useDb } from "@/lib/db";

export default function Onboarding() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const profile = useDb(() => getMyProfile(), []);
  useProfileTheme();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/auth?returnTo=/onboarding", { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const handleSkip = async () => {
    // Create a minimal profile so the onboarding gate has somewhere to land.
    await upsertProfile({
      name: user?.name ?? "Student",
      grade: "10",
      town: "",
      country: "Global",
      locationPublic: false,
      bio: "",
      socials: {},
      interests: [],
      subFields: [],
      theme: "light",
      publicProfile: true,
      onboardingComplete: true,
    });
    navigate("/app/for-you");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <Logo />
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Skip for now <ArrowRight className="ml-1.5 size-3.5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="size-4" />
          One-minute setup
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Make Antren yours.
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Tell us your grade, location, interests and the fields you work in. Every
          recommendation, deadline alert and peer match flows from this — and you
          can change it any time.
        </p>

        <div className="mt-10">
          {profile === undefined && <div className="h-96 animate-pulse rounded-2xl border bg-card" />}
          {profile !== undefined && (
            <ProfileForm
              initial={profile ? draftFromProfile(profile) : emptyDraft()}
              submitLabel="Save & start exploring"
              completeOnboarding
              onSaved={() => navigate("/app/for-you")}
            />
          )}
        </div>
      </main>
    </div>
  );
}
