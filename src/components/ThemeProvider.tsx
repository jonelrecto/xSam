"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isMounted: boolean;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

const THEME_STORAGE_KEY = "theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(key: string, defaultTheme: Theme): Theme {
  if (typeof window === "undefined") return defaultTheme;
  try {
    const saved = localStorage.getItem(key) as Theme | null;
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
  } catch {
    // LocalStorage might be disabled in private/sandboxed mode
  }
  return defaultTheme;
}

/**
 * Applies the resolved theme to the DOM (<html> tag).
 * Sets both CSS class and data-theme attribute, plus style.colorScheme.
 */
function applyThemeToDOM(resolved: ResolvedTheme, disableTransitions = false) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  let styleTag: HTMLStyleElement | null = null;
  if (disableTransitions) {
    styleTag = document.createElement("style");
    styleTag.appendChild(
      document.createTextNode(
        "*, *::before, *::after { transition: none !important; }"
      )
    );
    document.head.appendChild(styleTag);
  }

  // Update classes
  root.classList.remove("light", "dark");
  root.classList.add(resolved);

  // Update data attribute & color-scheme
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;

  if (disableTransitions && styleTag) {
    // Force reflow then remove style tag to restore transitions
    window.getComputedStyle(document.body);
    setTimeout(() => {
      styleTag?.remove();
    }, 1);
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = THEME_STORAGE_KEY,
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() =>
    getStoredTheme(storageKey, defaultTheme)
  );
  const [isMounted, setIsMounted] = useState(false);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    getSystemTheme()
  );

  // Compute active resolved theme
  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (theme === "system" && enableSystem) {
      return systemTheme;
    }
    return theme === "dark" ? "dark" : "light";
  }, [theme, systemTheme, enableSystem]);

  // Set theme handler
  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch {
        // LocalStorage fallback
      }
    },
    [storageKey]
  );

  // Quick toggle between light and dark
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  // Handle client mount and initial sync
  useEffect(() => {
    setIsMounted(true);
    const saved = getStoredTheme(storageKey, defaultTheme);
    setThemeState(saved);
    setSystemTheme(getSystemTheme());
  }, [storageKey, defaultTheme]);

  // Listen to OS system theme changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      // Compatibility for legacy Safari
      (mediaQuery as any).addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        (mediaQuery as any).removeListener(handleChange);
      }
    };
  }, []);

  // Listen for storage events across tabs
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey) {
        const newTheme = (e.newValue as Theme) || defaultTheme;
        if (
          newTheme === "light" ||
          newTheme === "dark" ||
          newTheme === "system"
        ) {
          setThemeState(newTheme);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [storageKey, defaultTheme]);

  // Apply changes to DOM whenever resolvedTheme changes
  useEffect(() => {
    if (!isMounted) return;
    applyThemeToDOM(resolvedTheme, disableTransitionOnChange);
  }, [resolvedTheme, isMounted, disableTransitionOnChange]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
      isMounted,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme, isMounted]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Inline Anti-FOUC script to inject inside `<head>`.
 * Executes synchronously before first paint to prevent flashes.
 */
export function ThemeScript({
  storageKey = THEME_STORAGE_KEY,
  defaultTheme = "system",
}: {
  storageKey?: string;
  defaultTheme?: Theme;
}) {
  const scriptContent = `
(function() {
  try {
    var storageKey = '${storageKey}';
    var defaultTheme = '${defaultTheme}';
    var theme = localStorage.getItem(storageKey) || defaultTheme;
    var resolved = theme;
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    root.setAttribute('data-theme', resolved);
    root.style.colorScheme = resolved;
  } catch (e) {}
})();
`.trim();

  return (
    <script
      id="theme-initializer"
      dangerouslySetInnerHTML={{ __html: scriptContent }}
    />
  );
}
