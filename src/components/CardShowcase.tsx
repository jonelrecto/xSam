"use client";

import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardImage,
  CardDivider,
  CardStat,
  CardSkeleton,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  ShieldCheck,
  Zap,
  Activity,
  ArrowRight,
  ExternalLink,
  Lock,
  Layers,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react";

export function CardShowcase() {
  const [clickCount, setClickCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "stats" | "interactive" | "media">("all");

  return (
    <section className="w-full py-12 space-y-8 animate-fade-in" id="card-showcase">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-b border-border/80 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Component Gallery
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-card-foreground">
            Card Variants & Theme Demo
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Test and verify all card variants in Light and Dark modes: surface contrast, image dimming, keyboard focus rings, interactive states, and nested elements.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/80 border border-border text-xs font-medium">
          {(["all", "stats", "interactive", "media"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                activeTab === tab
                  ? "bg-card text-card-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Stat & Dashboard Cards */}
      {(activeTab === "all" || activeTab === "stats") && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Dashboard & Stat Cards
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CardStat
              title="Active Exam Sessions"
              value="1,429"
              change="+14.2%"
              trend="up"
              caption="Across 38 connected institutions"
              icon={Users}
            />
            <CardStat
              title="Integrity Audits Passed"
              value="99.8%"
              change="+0.4%"
              trend="up"
              caption="Zero false-positive flags recorded"
              icon={ShieldCheck}
            />
            <CardStat
              title="Sync Latency"
              value="18 ms"
              change="-5.1%"
              trend="up"
              caption="Real-time Duplex WebSocket"
              icon={Zap}
            />
            <CardStat
              title="Offline Resilience"
              value="100%"
              change="Stable"
              trend="neutral"
              caption="IndexedDB zero data loss"
              icon={Layers}
            />
          </div>
        </div>
      )}

      {/* Row 2: Media, Interactive, Basic & Form Cards */}
      {(activeTab === "all" || activeTab === "media" || activeTab === "interactive") && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Image & Media Card with Dark Brightness Filter */}
          {(activeTab === "all" || activeTab === "media") && (
            <Card variant="elevated" className="flex flex-col justify-between group">
              <div>
                <CardImage
                  src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop"
                  alt="High-stakes proctoring dashboard"
                  aspectRatio="video"
                  badge={
                    <Badge variant="default" className="shadow-md backdrop-blur-md">
                      Featured Module
                    </Badge>
                  }
                />
                <CardHeader>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Fall Semester 2026</span>
                    <span>•</span>
                    <span className="text-primary font-medium">CS-401</span>
                  </div>
                  <CardTitle>Distributed Exam Proctoring</CardTitle>
                  <CardDescription>
                    Real-time AI integrity verification with client-side zero-knowledge proofs and end-to-end encryption.
                  </CardDescription>
                </CardHeader>
              </div>

              <CardFooter className="pt-2">
                <div className="flex items-center gap-2">
                  <Badge variant="success" className="text-[10px]">
                    Live Ready
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    240 Students
                  </span>
                </div>
                <Button size="sm" className="gap-1.5">
                  Launch
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Card 2: Interactive / Clickable Card with Focus Ring & Live Counter */}
          {(activeTab === "all" || activeTab === "interactive") && (
            <Card
              variant="interactive"
              onClick={() => setClickCount((c) => c + 1)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setClickCount((c) => c + 1);
                }
              }}
              className="flex flex-col justify-between border-dashed hover:border-solid group"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="warning">Clickable / Interactive</Badge>
                  <span className="text-xs font-mono text-muted-foreground group-hover:text-primary transition-colors">
                    Press Enter / Click
                  </span>
                </div>
                <CardTitle className="pt-2 group-hover:text-primary transition-colors flex items-center gap-2">
                  Interactive Card State
                  <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardTitle>
                <CardDescription>
                  Supports full keyboard accessibility with visible focus rings (`Tab`), active scaling feedback, and hover elevation.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/60 border border-border/80 flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    Times Activated:
                  </span>
                  <span className="text-lg font-black text-primary font-mono">
                    {clickCount}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Try focusing this card with the keyboard (`Tab` key) to inspect the visible focus ring!
                </p>
              </CardContent>

              <CardFooter>
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  WCAG Focus Ring
                </span>
                <Button variant="outline" size="sm" onClick={(e) => {
                  e.stopPropagation();
                  setClickCount(0);
                }}>
                  Reset Count
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Card 3: Form Card with Nested Inputs, Labels & Dividers */}
          {(activeTab === "all" || activeTab === "interactive") && (
            <Card variant="default" className="flex flex-col justify-between">
              <div>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">Nested Inputs</Badge>
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="pt-2">Session Quick Check</CardTitle>
                  <CardDescription>
                    All nested form controls, inputs, and placeholders adapt dynamically to the active theme.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Access Passcode
                    </label>
                    <Input
                      type="password"
                      placeholder="e.g. XSAM-2026-KEY"
                      defaultValue="SECURE-PASS"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Proctor Room
                    </label>
                    <Input
                      type="text"
                      placeholder="Room Code"
                      defaultValue="Hall B - Station 12"
                    />
                  </div>
                </CardContent>
              </div>

              <div>
                <div className="px-6">
                  <CardDivider />
                </div>
                <CardFooter className="mt-0 pt-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Auto-locks in 10m
                  </span>
                  <Button size="sm" variant="default">
                    Validate
                  </Button>
                </CardFooter>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Row 3: Glassmorphic & Loading Skeleton Variants */}
      {activeTab === "all" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Glass Card */}
          <Card variant="glass" className="p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                  Glassmorphic Variant
                </Badge>
                <Sparkles className="w-4 h-4 text-cyan-500" />
              </div>
              <h3 className="text-xl font-bold text-card-foreground">
                Backdrop Filter & Translucency
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Adapts seamlessly to both light glass (`rgba(255,255,255,0.85)`) and dark glass (`rgba(30,41,59,0.7)`) with background blur.
              </p>
            </div>
            <div className="pt-6 flex items-center justify-between border-t border-border/40 mt-4">
              <span className="text-xs font-mono text-muted-foreground">
                backdrop-blur-xl
              </span>
              <Button size="sm" variant="secondary">
                Preview Blur
              </Button>
            </div>
          </Card>

          {/* Shimmer Skeleton Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Themed Shimmer Skeleton
              </span>
              <Badge variant="outline" className="text-[10px]">
                Loading State
              </Badge>
            </div>
            <CardSkeleton />
          </div>
        </div>
      )}
    </section>
  );
}
