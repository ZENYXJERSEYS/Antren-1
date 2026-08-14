import { Settings as SettingsIcon } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ProfileForm, draftFromProfile, emptyDraft } from "@/components/ProfileForm";

export default function Settings() {
  const profile = useQuery(api.profiles.getMine);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <SettingsIcon className="size-5" />
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Your profile, interests, and appearance.
          </p>
        </div>
      </div>

      <div className="mt-8">
        {profile === undefined && (
          <div className="h-96 animate-pulse rounded-2xl border bg-card" />
        )}
        {profile !== undefined && (
          <ProfileForm initial={profile ? draftFromProfile(profile) : emptyDraft()} />
        )}
      </div>
    </div>
  );
}
