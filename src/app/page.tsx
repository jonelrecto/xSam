import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/auth-server";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Zap,
  Lock,
  FileCheck2,
  Users,
  Terminal,
  ArrowRight,
} from "lucide-react";

export default async function HomePage() {
  const session = await getSession();

  if (session && session.user) {
    const role = (session.user as Record<string, unknown>).role as string;
    redirect(homeFor(role));
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-600/15 via-cyan-500/10 to-transparent blur-3xl pointer-events-none" />

      <Navbar user={null} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-16 max-w-6xl mx-auto w-full z-10">
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold uppercase tracking-wider animate-fade-in">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            Secure Exam & Proctoring Environment
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            Academic Integrity,{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">
              Without Compromise.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            XSAM / SEPE combines server-anchored examination timekeeping,
            zero-knowledge student paper distribution, resilient offline-first
            syncing, and transparent integrity auditing.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto font-semibold gap-2">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto font-semibold">
                Sign In to Portal
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full">
          <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-lg hover:border-indigo-500/40 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Role-Based Access Control</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Multi-tier security guards across route groups, actions, and DB hooks
              safeguard against privilege escalation and credential tampering.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-lg hover:border-cyan-500/40 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Offline-First Execution</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              IndexedDB dual-storage ensures student answers are safely preserved
              during network interruptions and synced idempotently upon reconnect.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-lg hover:border-emerald-500/40 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Non-Punitive Integrity</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Objective event logging (tab switches, full-screen exits) delivers
              transparent review timelines for educators without automated disqualifications.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>© 2026 XSAM / SEPE. Secure Exam & Proctoring Environment.</p>
      </footer>
    </div>
  );
}
