import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth-client";
import { Navbar } from "../components/layout/Navbar";
import { Button } from "../components/ui/button";
import { CardShowcase } from "../components/CardShowcase";
import {
  ShieldCheck,
  Zap,
  Lock,
  FileCheck2,
  ArrowRight,
} from "lucide-react";

export function LandingPage() {
  const { data: session } = useAuth();
  const user = session?.user as any;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground relative overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-500/15 via-cyan-500/10 to-transparent blur-3xl pointer-events-none" />

      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-16 max-w-6xl mx-auto w-full z-10">
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider animate-fade-in">
            <ShieldCheck className="w-4 h-4" />
            Secure Exam & Proctoring Environment
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground leading-tight">
            Academic Integrity,{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500 dark:from-indigo-400 dark:via-cyan-400 dark:to-emerald-400">
              Without Compromise.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-normal">
            XSAM / SEPE combines server-anchored examination timekeeping,
            zero-knowledge student paper distribution, resilient offline-first
            syncing, and transparent integrity auditing.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link to={user.role === "student" ? "/student" : "/teacher"}>
                <Button size="lg" className="font-semibold gap-2">
                  Enter Dashboard ({user.role})
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/signup" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto font-semibold gap-2">
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto font-semibold">
                    Sign In to Portal
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full">
          <div className="p-6 rounded-2xl border border-border bg-card/80 backdrop-blur-lg hover:border-primary/40 transition-colors space-y-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-primary">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-card-foreground">Role-Based Security</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Multi-tier security guards across Fastify routes and Better-Auth session tokens
              safeguard against privilege escalation.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card/80 backdrop-blur-lg hover:border-cyan-500/40 transition-colors space-y-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-card-foreground">Offline-First Execution</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Dexie.js IndexedDB dual-storage ensures student answers are safely preserved
              during network drops and synced via Duplex WebSocket.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card/80 backdrop-blur-lg hover:border-emerald-500/40 transition-colors space-y-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-card-foreground">Non-Punitive Integrity</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Objective event logging (tab switches, full-screen exits) delivers
              transparent review timelines for educators without automated disqualifications.
            </p>
          </div>
        </div>

        {/* Card Component Showcase Grid */}
        <CardShowcase />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>© 2026 XSAM / SEPE. Decoupled Monolithic Exam Platform.</p>
      </footer>
    </div>
  );
}
