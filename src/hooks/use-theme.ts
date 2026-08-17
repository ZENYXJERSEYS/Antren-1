import { useEffect } from "react";
import { getMyProfile, useDb } from "@/lib/db";
import { applyTheme, DEFAULT_THEME, type ThemeName } from "@/lib/theme";

/**
 * Keeps the document theme in sync with the signed-in profile's preference.
 * Falls back to the light (default) theme while signed out or loading.
 */
export function useProfileTheme() {
  const profile = useDb(() => getMyProfile(), []);

  useEffect(() => {
    const theme = (profile?.theme ?? DEFAULT_THEME) as ThemeName;
    applyTheme(theme, profile?.accentColor ?? undefined);
  }, [profile?.theme, profile?.accentColor]);
}
