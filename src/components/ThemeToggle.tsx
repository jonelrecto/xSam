"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import type { Theme } from "@/components/ThemeProvider";
import { Sun, Moon, Laptop, Check, ChevronDown } from "lucide-react";

interface ThemeToggleProps {
  /** Optional custom class name for styling */
  className?: string;
  /** Whether to show a compact icon-only cycle toggle or a full dropdown */
  variant?: "dropdown" | "cycle" | "segmented";
  /** Alignment of dropdown menu */
  align?: "left" | "right";
}

const THEME_OPTIONS: {
  value: Theme;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "light",
    label: "Light",
    description: "Crisp, bright workspace",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Subtle, low-glare dark palette",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Follows your operating system",
    icon: Laptop,
  },
];

export function ThemeToggle({
  className = "",
  variant = "dropdown",
  align = "right",
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme, isMounted } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation inside dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const menu = containerRef.current?.querySelector('[role="menu"]');
      if (!menu) return;
      const items = Array.from(
        menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
      );
      const currentIndex = items.findIndex(
        (item) => item === document.activeElement
      );
      let nextIndex = 0;
      if (e.key === "ArrowDown") {
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      }
      items[nextIndex]?.focus();
    }
  };

  // Compact segmented control variant
  if (variant === "segmented") {
    return (
      <div
        className={`inline-flex items-center p-1 rounded-xl bg-muted/80 border border-border text-muted-foreground ${className}`}
        role="group"
        aria-label="Color theme switcher"
      >
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = isMounted ? theme === opt.value : opt.value === "system";
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              aria-pressed={isSelected}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "hover:text-foreground hover:bg-background/40"
              }`}
              title={`Switch to ${opt.label} mode`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="capitalize">{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Quick single-click cycle toggle variant
  if (variant === "cycle") {
    const isDark = isMounted ? resolvedTheme === "dark" : true;
    return (
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleTheme}
        aria-label={`Current theme: ${theme}. Click to switch to ${
          isDark ? "light" : "dark"
        } mode.`}
        className={`relative inline-flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-background/80 hover:bg-accent text-foreground hover:text-accent-foreground backdrop-blur-md transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
        title={`Toggle theme (currently ${theme})`}
      >
        <Sun
          className={`w-4 h-4 transition-all duration-300 transform ${
            isDark
              ? "rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100 text-amber-500"
          }`}
        />
        <Moon
          className={`absolute w-4 h-4 transition-all duration-300 transform ${
            isDark
              ? "rotate-0 scale-100 opacity-100 text-indigo-400"
              : "-rotate-90 scale-0 opacity-0"
          }`}
        />
        <span className="sr-only">Toggle theme</span>
      </button>
    );
  }

  // Default accessible Dropdown variant
  const activeIcon = !isMounted
    ? Moon
    : theme === "system"
    ? Laptop
    : resolvedTheme === "dark"
    ? Moon
    : Sun;

  const ActiveIconComponent = activeIcon;

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Theme selection menu. Current theme: ${theme} (${
          resolvedTheme || "dark"
        } mode active)`}
        className={`group inline-flex items-center justify-center gap-1.5 h-9 px-2.5 rounded-xl border border-border bg-background/80 hover:bg-accent/60 text-foreground transition-all duration-200 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 shadow-sm`}
        title="Change theme preference"
      >
        <div className="relative w-4 h-4 flex items-center justify-center">
          <ActiveIconComponent
            className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
              resolvedTheme === "light" && theme === "light"
                ? "text-amber-500"
                : resolvedTheme === "dark" && theme === "dark"
                ? "text-indigo-400"
                : "text-muted-foreground"
            }`}
          />
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Accessible Dropdown Popover */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="theme-toggle"
          className={`absolute z-50 mt-2 w-56 rounded-2xl border border-border bg-card/95 p-1.5 text-card-foreground shadow-2xl backdrop-blur-xl animate-fade-in focus:outline-none ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="px-2.5 py-1.5 mb-1 border-b border-border/60">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Color Theme
            </p>
            <p className="text-xs text-muted-foreground/80 mt-0.5">
              Active: <span className="font-semibold text-foreground capitalize">{theme}</span>
              {theme === "system" && (
                <span className="text-[10px] text-muted-foreground ml-1">
                  ({resolvedTheme})
                </span>
              )}
            </p>
          </div>

          <div className="space-y-0.5">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = isMounted && theme === option.value;

              return (
                <button
                  key={option.value}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setTheme(option.value);
                    setIsOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs font-medium transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                    isSelected
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span>{option.label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 font-normal">
                        {option.description}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-primary animate-fade-in" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
