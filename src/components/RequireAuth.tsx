import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { getMyProfile, useDb } from "@/lib/db";

/**
 * Guards children behind authentication.
 * - Not signed in → /auth?returnTo=...
 * - Signed in but onboarding incomplete → /onboarding
 * - Otherwise → render children
 */
export function RequireAuth({
  children,
  requireOnboarding = true,
}: {
  children: ReactNode;
  requireOnboarding?: boolean;
}) {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();
  const profile = useDb(() => getMyProfile(), []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/auth?returnTo=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  // If profile exists and onboarding is not complete, redirect to onboarding
  if (requireOnboarding && profile !== undefined && profile !== null && !profile.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
