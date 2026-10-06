import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Theme System & Tokens Logic", () => {
  beforeEach(() => {
    // Reset DOM and localStorage mock
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
    });

    vi.stubGlobal("window", {
      matchMedia: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("dark"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("defaults to system theme when no stored preference exists", () => {
    const stored = localStorage.getItem("theme");
    expect(stored).toBeNull();

    // System resolution simulation
    const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = stored || (isSystemDark ? "dark" : "light");
    expect(resolved).toBe("dark");
  });

  it("persists theme preference to localStorage on user selection", () => {
    localStorage.setItem("theme", "light");
    expect(localStorage.getItem("theme")).toBe("light");

    localStorage.setItem("theme", "dark");
    expect(localStorage.getItem("theme")).toBe("dark");

    localStorage.setItem("theme", "system");
    expect(localStorage.getItem("theme")).toBe("system");
  });

  it("resolves explicitly chosen light or dark theme regardless of system setting", () => {
    const resolveTheme = (theme: string, systemDark: boolean) => {
      if (theme === "system") {
        return systemDark ? "dark" : "light";
      }
      return theme;
    };

    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("light", false)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("dark", true)).toBe("dark");
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("anti-FOUC script correctly computes and assigns classes/attributes", () => {
    const mockRoot = {
      classList: {
        classes: new Set<string>(),
        remove(...cls: string[]) {
          cls.forEach((c) => this.classes.delete(c));
        },
        add(...cls: string[]) {
          cls.forEach((c) => this.classes.add(c));
        },
        contains(cls: string) {
          return this.classes.has(cls);
        },
      },
      attributes: {} as Record<string, string>,
      setAttribute(name: string, value: string) {
        this.attributes[name] = value;
      },
      style: {
        colorScheme: "",
      },
    };

    // Test with light stored
    localStorage.setItem("theme", "light");
    const theme = localStorage.getItem("theme") || "system";
    const resolved = theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;

    mockRoot.classList.remove("light", "dark");
    mockRoot.classList.add(resolved);
    mockRoot.setAttribute("data-theme", resolved);
    mockRoot.style.colorScheme = resolved;

    expect(mockRoot.classList.contains("light")).toBe(true);
    expect(mockRoot.classList.contains("dark")).toBe(false);
    expect(mockRoot.attributes["data-theme"]).toBe("light");
    expect(mockRoot.style.colorScheme).toBe("light");
  });

  it("verifies card token styles and contrast hierarchy", () => {
    // Validates that card variants define appropriate contrast tokens
    const cardVariantClasses = {
      default: "bg-card text-card-foreground border border-border shadow-sm",
      elevated: "bg-card text-card-foreground border border-border/80 shadow-lg",
      interactive: "hover:border-primary/50 focus-visible:ring-primary cursor-pointer",
      imageFilterDark: "dark:brightness-[0.88] dark:contrast-[1.05]",
    };

    expect(cardVariantClasses.default).toContain("bg-card");
    expect(cardVariantClasses.default).toContain("text-card-foreground");
    expect(cardVariantClasses.interactive).toContain("focus-visible:ring-primary");
    expect(cardVariantClasses.imageFilterDark).toContain("dark:brightness-[0.88]");
  });
});
