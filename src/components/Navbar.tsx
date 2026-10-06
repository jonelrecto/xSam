"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Shield,
  LogOut,
  User as UserIcon,
  BookOpen,
  GraduationCap,
  FileText,
} from "lucide-react";

interface NavbarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
    image?: string | null;
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Sign out failed:", err);
      setIsLoggingOut(false);
    }
  };

  const role = user?.role || "student";

  const getBadgeVariant = (r: string) => {
    switch (r) {
      case "admin":
        return "destructive";
      case "teacher":
        return "default";
      case "student":
      default:
        return "success";
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand / Logo & Teacher Nav */}
        <div className="flex items-center gap-6">
          <Link
            href={user ? `/${role}` : "/"}
            className="flex items-center gap-3 group transition-transform active:scale-95"
            aria-label="XSAM SEPE Home"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-foreground flex items-center gap-1.5">
                XSAM{" "}
                <span className="text-xs font-medium text-primary font-mono tracking-widest px-1.5 py-0.5 rounded bg-primary/10 border border-primary/30">
                  SEPE
                </span>
              </span>
              <p className="text-[10px] text-muted-foreground tracking-wider uppercase font-medium">
                Secure Exam Environment
              </p>
            </div>
          </Link>

          {/* Teacher Navigation Links */}
          {user && (role === "teacher" || role === "admin") && (
            <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-border">
              <Link
                href="/teacher"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname === "/teacher" || pathname.startsWith("/teacher/exams")
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Exams
                </span>
              </Link>

              <Link
                href="/teacher/bank"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname.startsWith("/teacher/bank")
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                  Question Bank
                </span>
              </Link>

              <Link
                href="/teacher/classes"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname.startsWith("/teacher/classes")
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-cyan-500" />
                  Classes & Rosters
                </span>
              </Link>
            </nav>
          )}
        </div>

        {/* Right: Theme Toggle & User menu & Action */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Accessible Theme Selector */}
          <ThemeToggle />

          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-foreground">
                  {user.name || "User"}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {user.email}
                </span>
              </div>

              <Badge variant={getBadgeVariant(role)} className="capitalize font-mono">
                {role}
              </Badge>

              <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center text-sm font-bold text-primary">
                {user.name ? (
                  user.name.slice(0, 2).toUpperCase()
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                isLoading={isLoggingOut}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-1"
                title="Sign out"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Create account</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
