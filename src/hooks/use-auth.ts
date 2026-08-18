import { useEffect, useState } from "react";
import {
  getCurrentUser,
  onAuthChange,
  signOut as localSignOut,
  type AuthUser,
} from "@/lib/local-auth";
import { getMyProfile } from "@/lib/db";
import type { Profile } from "@/lib/supabase";

/**
 * Local auth hook. No Supabase auth — simple localStorage session.
 * Keeps the same shape the app's components already consume:
 * { isLoading, isAuthenticated, user, signOut }.
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthChange((authUser) => {
      if (cancelled) return;
      setUser(authUser);
      setLoading(false);

      if (authUser) {
        getMyProfile().then((p) => {
          if (!cancelled) setProfile(p);
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const currentUser: AuthUser | undefined = user
    ? {
        id: user.id,
        name:
          profile?.name ||
          user.name ||
          user.email?.split("@")[0] ||
          "Student",
        email: user.email,
      }
    : undefined;

  // Loading until the session resolves and (when signed in) the profile loads.
  const isLoading = loading || (user ? profile === undefined : false);

  const signOut = () => {
    localSignOut();
    setUser(null);
    setProfile(null);
  };

  return {
    isLoading,
    isAuthenticated: !!user,
    user: currentUser ? { _id: currentUser.id, name: currentUser.name, email: currentUser.email } : undefined,
    signOut,
    isPasswordRecovery: false,
  };
}
