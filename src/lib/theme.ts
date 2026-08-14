/**
 * Antren theme system.
 *
 * Themes: light (default), dark, espresso (cocoa night), custom accent.
 * The palette lives in src/index.css as CSS variables; this module maps a
 * profile's `theme` + `accentColor` onto the <html> element.
 */

import { ACCENTS } from "@/lib/taxonomy";

export type ThemeName = "light" | "dark" | "espresso" | "custom";

const THEME_CLASS = {
  light: "",
  dark: "dark",
  espresso: "theme-espresso",
  custom: "theme-custom",
} as const;

/** Resolve the readable foreground for a custom accent on light surfaces. */
export function accentForeground(accentColor: string): string {
  const match = ACCENTS.find((a) => a.color.toLowerCase() === accentColor.toLowerCase());
  return match?.lightOn ?? "#03281b";
}

/**
 * Apply a theme to the document root. Safe to call on every render — it's a
 * cheap set of class/style mutations that only touch the <html> element.
 */
export function applyTheme(theme: ThemeName, accentColor?: string) {
  const root = document.documentElement;
  root.classList.remove("dark", "theme-espresso", "theme-custom");

  const cls = THEME_CLASS[theme];
  if (cls) root.classList.add(cls);

  if (theme === "custom" && accentColor) {
    root.style.setProperty("--accent-color", accentColor);
    root.style.setProperty("--accent-color-fg", accentForeground(accentColor));
  } else {
    root.style.removeProperty("--accent-color");
    root.style.removeProperty("--accent-color-fg");
  }
}

/** Default theme used on public pages before a profile loads. */
export const DEFAULT_THEME: ThemeName = "light";
