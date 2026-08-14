import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { applyTheme, DEFAULT_THEME, type ThemeName } from "@/lib/theme";

/**
 * Keeps the document theme in sync with the signed-in profile's preference.
 * Falls back to the light (default) theme while signed out or loading.
 */
export function useProfileTheme() {
  const profile = useQuery(api.profiles.getMine);

  useEffect(() => {
    const theme = (profile?.theme ?? DEFAULT_THEME) as ThemeName;
    applyTheme(theme, profile?.accentColor ?? undefined);
  }, [profile?.theme, profile?.accentColor]);
}
