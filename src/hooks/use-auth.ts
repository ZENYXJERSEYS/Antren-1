import { useEffect, useState } from "react";
import { supabase, type CurrentUser, type Profile } from "@/lib/supabase";
import { getMyProfile } from "@/lib/db";

/**
 * Supabase-backed auth hook. Keeps the same shape the app's components
 * already consume: { isLoading, isAuthenticated, user, signOut }.
 */
export function useAuth() {
  const [authState, setAuthState] = useState<{ user: { id: string; email?: string; name?: string } | null; loading: boolean }>({
    user: null,
    loading: true,
  });
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  // True while the user landed on a password-recovery link from their email.
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refreshProfile = (userId: string) => {
      getMyProfile().then((p) => {
        if (!cancelled) setProfile(p);
      });
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      setIsPasswordRecovery(event === "PASSWORD_RECOVERY");
      const u = session?.user ?? null;
      setAuthState({
        user: u ? { id: u.id, email: u.email ?? undefined, name: (u.user_metadata?.name as string) ?? undefined } : null,
        loading: false,
      });
      if (u) refreshProfile(u.id);
      else setProfile(null);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const u = data.session?.user ?? null;
      setAuthState({
        user: u ? { id: u.id, email: u.email ?? undefined, name: (u.user_metadata?.name as string) ?? undefined } : null,
        loading: false,
      });
      if (u) refreshProfile(u.id);
      else setProfile(null);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const user: CurrentUser | undefined = authState.user
    ? {
        _id: authState.user.id,
        name:
          profile?.name ||
          authState.user.name ||
          authState.user.email?.split("@")[0] ||
          "Student",
        email: authState.user.email,
        role: undefined,
      }
    : undefined;

  // Loading until the session resolves and (when signed in) the profile loads.
  const isLoading = authState.loading || (authState.user ? profile === undefined : false);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    isLoading,
    isAuthenticated: !!authState.user,
    user,
    signOut,
    isPasswordRecovery,
  };
}
