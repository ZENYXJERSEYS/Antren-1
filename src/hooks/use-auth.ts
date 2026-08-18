import { useState } from "react";
import {
  getCurrentUser,
  signOut as localSignOut,
  type AuthUser,
} from "@/lib/local-auth";

/**
 * Auth hook — reads session from localStorage.
 * Returns isAuthenticated=false when no session exists.
 * Includes onboardingComplete so components can gate on it.
 */
export function useAuth() {
  const [user] = useState<AuthUser | null>(() => getCurrentUser());

  const isAuthenticated = !!user;

  const signOut = () => {
    localSignOut();
    window.location.href = "/auth";
  };

  if (!user) {
    return {
      isLoading: false,
      isAuthenticated: false,
      user: null,
      signOut,
      isPasswordRecovery: false,
    };
  }

  return {
    isLoading: false,
    isAuthenticated: true,
    user: { _id: user.id, name: user.name, email: user.email },
    signOut,
    isPasswordRecovery: false,
  };
}
