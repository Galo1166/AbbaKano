"use client";

import { useEffect, useState } from "react";

export type ThemeMode = "dark" | "light";
export type ThemePreference = "system" | ThemeMode;

const THEME_STORAGE_KEY = "abbakano-theme";

let currentThemePreference: ThemePreference = "system";
let currentTheme: ThemeMode = "dark";
const themeListeners = new Set<() => void>();

export function getSystemTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

export function getEffectiveTheme(pref: ThemePreference): ThemeMode {
  return pref === "system" ? getSystemTheme() : pref;
}

export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
}

function syncThemeStateFromPreference(nextPreference: ThemePreference) {
  currentThemePreference = nextPreference;
  currentTheme = getEffectiveTheme(nextPreference);
  applyThemeMode(currentTheme);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
  }
  themeListeners.forEach((listener) => listener());
}

function initializeThemeState() {
  if (typeof window === "undefined") return;
  const storedPreference = getStoredThemePreference();
  currentThemePreference = storedPreference;
  currentTheme = getEffectiveTheme(storedPreference);
  applyThemeMode(currentTheme);
}

export function useThemeMode() {
  const [themeState, setThemeState] = useState(() => ({
    themePreference: currentThemePreference,
    theme: currentTheme,
  }));

  useEffect(() => {
    initializeThemeState();
    setThemeState({
      themePreference: currentThemePreference,
      theme: currentTheme,
    });

    const syncTheme = () => setThemeState({
      themePreference: currentThemePreference,
      theme: currentTheme,
    });

    themeListeners.add(syncTheme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const handleSystemChange = () => {
      if (currentThemePreference === "system") {
        const nextTheme = getSystemTheme();
        currentTheme = nextTheme;
        applyThemeMode(nextTheme);
        syncTheme();
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const nextPreference = getStoredThemePreference();
      if (nextPreference !== currentThemePreference) {
        currentThemePreference = nextPreference;
        currentTheme = getEffectiveTheme(nextPreference);
        applyThemeMode(currentTheme);
        syncTheme();
      }
    };

    mediaQuery.addEventListener("change", handleSystemChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      themeListeners.delete(syncTheme);
      mediaQuery.removeEventListener("change", handleSystemChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = currentTheme === "dark" ? "light" : "dark";
    syncThemeStateFromPreference(nextTheme);
  };

  return {
    theme: themeState.theme,
    themePreference: themeState.themePreference,
    effectiveTheme: themeState.theme,
    toggleTheme,
    setTheme: (next: ThemeMode) => {
      syncThemeStateFromPreference(next);
    },
    setThemePreference: (next: ThemePreference) => {
      syncThemeStateFromPreference(next);
    },
  };
}
