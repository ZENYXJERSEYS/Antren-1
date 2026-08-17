import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, useMemo, useState, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const AppShell = lazy(() => import("./components/AppShell.tsx"));
const ForYou = lazy(() => import("./pages/app/ForYou.tsx"));
const Explore = lazy(() => import("./pages/app/Explore.tsx"));
const Saved = lazy(() => import("./pages/app/Saved.tsx"));
const Pipeline = lazy(() => import("./pages/app/Pipeline.tsx"));
const Peers = lazy(() => import("./pages/app/Peers.tsx"));
const Settings = lazy(() => import("./pages/app/Settings.tsx"));
const OpportunityDetail = lazy(() => import("./pages/app/OpportunityDetail.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in WebContainer environment). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[WebContainer preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * The deployment that holds the full opportunity catalog (200k+ records,
 * users, and profiles). The build pipeline sometimes injects a stale or
 * empty deployment URL, and Convex deployments can be paused or disabled,
 * so we probe candidates at startup and use whichever is actually healthy.
 */
const CATALOG_CONVEX_URL = "https://academic-mockingbird-541.convex.cloud";

/**
 * Probe a deployment's public query API to see if it can serve the app right
 * now. Returns the live opportunity count (0 when unhealthy). Uses the public
 * HTTP endpoint so this works before the Convex client is created.
 */
async function probeDeployment(url: string): Promise<{ healthy: boolean; count: number }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${url}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Convex-Client": "antren-web-0.0.1" },
      body: JSON.stringify({ path: "opportunities:stats", format: "json", args: [] }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { healthy: false, count: 0 };
    const data = await res.json();
    if (data?.status !== "success" || !data.value) return { healthy: false, count: 0 };
    const count = typeof data.value.opportunities === "number" ? data.value.opportunities : 0;
    return { healthy: true, count };
  } catch {
    return { healthy: false, count: 0 };
  }
}

/**
 * Pick the deployment that actually serves data right now. Ties go to the
 * build-configured URL; a deployment with more live opportunities wins, so the
 * app automatically serves the full catalog once its backend is re-enabled.
 */
async function pickConvexUrl(): Promise<string> {
  const candidates = [
    ...new Set(
      [import.meta.env.VITE_CONVEX_URL, CATALOG_CONVEX_URL].filter(
        (u): u is string => !!u,
      ),
    ),
  ];
  let best = candidates[0] ?? CATALOG_CONVEX_URL;
  let bestCount = -1;
  for (const url of candidates) {
    const { healthy, count } = await probeDeployment(url);
    if (healthy && count > bestCount) {
      best = url;
      bestCount = count;
    }
  }
  return best;
}

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

function AntrenApp() {
  const [convexUrl, setConvexUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    pickConvexUrl().then((url) => {
      if (!cancelled) setConvexUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const convex = useMemo(
    () => (convexUrl ? new ConvexReactClient(convexUrl) : null),
    [convexUrl],
  );

  if (!convex) {
    return <RouteLoading />;
  }

  return (
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route
                path="/auth"
                element={<AuthPage redirectAfterAuth="/app/for-you" />}
              />
              <Route
                path="/onboarding"
                element={
                  <RequireAuth>
                    <Onboarding />
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard"
                element={<Navigate to="/app/for-you" replace />}
              />
              <Route
                path="/app"
                element={
                  <RequireAuth>
                    <AppShell />
                  </RequireAuth>
                }
              >
                <Route index element={<Navigate to="/app/for-you" replace />} />
                <Route path="for-you" element={<ForYou />} />
                <Route path="explore" element={<Explore />} />
                <Route path="saved" element={<Saved />} />
                <Route path="pipeline" element={<Pipeline />} />
                <Route path="peers" element={<Peers />} />
                <Route path="settings" element={<Settings />} />
                <Route path="opportunity/:id" element={<OpportunityDetail />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
    </RootErrorBoundary>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AntrenApp />
  </StrictMode>,
);
