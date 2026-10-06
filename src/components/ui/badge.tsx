import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-primary/15 text-primary border-primary/30",
    secondary: "bg-secondary text-secondary-foreground border-border",
    destructive: "bg-destructive/15 text-destructive border-destructive/30",
    outline: "text-foreground border-border bg-transparent",
    success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
