import type { ReactNode } from "react";

/**
 * RequireAuth is now a no-op wrapper.
 * The user requested zero auth gates in the app.
 * All children render immediately without any login check.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
