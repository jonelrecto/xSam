import * as React from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "glass" | "interactive" | "outline";
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", hoverable = false, ...props }, ref) => {
    const variantStyles = {
      default:
        "bg-card text-card-foreground border border-border shadow-sm",
      elevated:
        "bg-card text-card-foreground border border-border/80 shadow-lg shadow-black/5 dark:shadow-none dark:border-border",
      glass:
        "glass-card text-card-foreground border border-border/60 shadow-xl backdrop-blur-xl",
      interactive:
        "bg-card text-card-foreground border border-border shadow-sm hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      outline:
        "bg-transparent text-card-foreground border border-border/80 shadow-none hover:bg-card/40",
    };

    const isInteractive = variant === "interactive" || hoverable;

    return (
      <div
        ref={ref}
        tabIndex={isInteractive ? 0 : undefined}
        role={isInteractive ? "region" : undefined}
        className={cn(
          "rounded-2xl transition-all duration-200 relative overflow-hidden",
          variantStyles[variant],
          hoverable &&
            "hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg sm:text-xl font-bold tracking-tight text-card-foreground",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-between p-6 pt-0 border-t border-border/60 mt-4",
      className
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export interface CardImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  aspectRatio?: "video" | "square" | "wide";
  badge?: React.ReactNode;
}

export const CardImage = React.forwardRef<HTMLImageElement, CardImageProps>(
  ({ className, alt, aspectRatio = "video", badge, ...props }, ref) => {
    const aspectClasses = {
      video: "aspect-video",
      square: "aspect-square",
      wide: "aspect-[21/9]",
    };

    return (
      <div className="relative w-full overflow-hidden bg-muted/60 border-b border-border/60">
        <img
          ref={ref}
          alt={alt || "Card visual banner"}
          loading="lazy"
          className={cn(
            "w-full object-cover transition-all duration-300 hover:scale-105",
            "filter dark:brightness-[0.88] dark:contrast-[1.05]",
            aspectClasses[aspectRatio],
            className
          )}
          {...props}
        />
        {badge && (
          <div className="absolute top-3 right-3 z-10">{badge}</div>
        )}
      </div>
    );
  }
);
CardImage.displayName = "CardImage";

export const CardDivider = React.forwardRef<
  HTMLHRElement,
  React.HTMLAttributes<HTMLHRElement>
>(({ className, ...props }, ref) => (
  <hr
    ref={ref}
    className={cn("border-t border-border/70 my-4 -mx-6", className)}
    {...props}
  />
));
CardDivider.displayName = "CardDivider";

export interface CardStatProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  caption?: string;
  icon?: React.ElementType;
  className?: string;
}

export function CardStat({
  title,
  value,
  change,
  trend = "up",
  caption,
  icon: Icon,
  className = "",
}: CardStatProps) {
  const trendColors = {
    up: "text-emerald-700 bg-emerald-500/10 border-emerald-500/30 dark:text-emerald-400",
    down: "text-rose-700 bg-rose-500/10 border-rose-500/30 dark:text-rose-400",
    neutral: "text-muted-foreground bg-muted border-border",
  };

  return (
    <Card className={cn("p-5 flex flex-col justify-between", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-2">
        <span className="text-2xl sm:text-3xl font-black tracking-tight text-card-foreground">
          {value}
        </span>
        {change && (
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border",
              trendColors[trend]
            )}
          >
            {change}
          </span>
        )}
      </div>

      {caption && (
        <p className="mt-2 text-xs text-muted-foreground/80 line-clamp-1">
          {caption}
        </p>
      )}
    </Card>
  );
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <Card className={cn("p-6 space-y-4 animate-pulse", className)}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-5/6" />
      </div>
      <div className="h-9 bg-muted rounded-xl w-full pt-2" />
    </Card>
  );
}
