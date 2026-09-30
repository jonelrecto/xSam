import React from "react";
import { getSession } from "@/lib/auth-server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Database, Users, Key, Server } from "lucide-react";

export default async function AdminDashboard() {
  const session = await getSession();
  const user = session?.user;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 rounded-2xl border border-red-900/30 bg-gradient-to-r from-red-950/40 via-slate-900/80 to-slate-900/40 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2">
            <Badge variant="destructive">Admin Console</Badge>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            System Administration
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Welcome, {user?.name || "Administrator"}. Manage platform security, database migrations, and role escalation audit logs.
          </p>
        </div>
      </div>

      {/* System Health & Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader className="pb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center mb-1">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm font-semibold text-slate-300">
              Privilege Escalation Hooks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold text-emerald-400">Enforced & Active</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              `user.update.before` and `user.create.before` active in Better Auth.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader className="pb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-1">
              <Database className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm font-semibold text-slate-300">
              Database Engine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-lg font-bold text-white">PostgreSQL / Drizzle</span>
            <p className="text-[11px] text-slate-500 mt-1">
              Schema synced with Better Auth and quota records.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader className="pb-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-1">
              <Users className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm font-semibold text-slate-300">
              Role Protection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Badge variant="success">Student</Badge>
              <Badge variant="default">Teacher</Badge>
              <Badge variant="destructive">Admin</Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Admin roles provisioned strictly via direct DB seeds.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Directives Info */}
      <Card className="border-slate-800 bg-slate-900/80 shadow-lg">
        <CardHeader>
          <CardTitle>XSAM Architecture Directives</CardTitle>
          <CardDescription>
            System invariants and phase roadmap status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Phase 1: Authentication & RBAC
              </h4>
              <p className="text-xs text-slate-300">
                Active. Role guards configured across routes, server actions, and DB hooks.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Phase 2: Exam Authoring & Draft Studio
              </h4>
              <p className="text-xs text-slate-400">
                Next in roadmap: Questions table, optimistic locking, and CSV validation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
