import { useState } from "react";
import {
  getCurrentUser,
  signOut as localSignOut,
  type AuthUser,
} from "@/lib/local-auth";

/**
 * Auth hook — always returns authenticated with a user.
 * No loading states, no profile fetching from Supabase.
 * The user requested zero auth blocks in the app.
 */
export function useAuth() {
  // Initialize user from localStorage once — sync, no async needed.
  const [user] = useState<AuthUser | null>(() => getCurrentUser());

  const currentUser = user
    ? {
        id: user.id,
        name: user.name || user.email?.split("@")[0] || "Student",
        email: user.email,
      }
    : {
        id: "anonymous-" + Date.now(),
        name: "Student",
        email: "",
      };

  const signOut = () => {
    localSignOut();
    // Force page reload to reset state cleanly
    window.location.href = "/auth";
  };

  return {
    isLoading: false,
    isAuthenticated: true,
    user: { _id: currentUser.id, name: currentUser.name, email: currentUser.email },
    signOut,
    isPasswordRecovery: false,
  };
}
