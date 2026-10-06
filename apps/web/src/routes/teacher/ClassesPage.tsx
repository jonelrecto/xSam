import React, { useEffect, useState, useTransition } from "react";
import { Link } from "react-router-dom";
import { teacherApi } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Users,
  Plus,
  ArrowLeft,
  GraduationCap,
  Calendar,
  ArrowRight,
} from "lucide-react";

export function ClassesPage() {
  const [isPending, startTransition] = useTransition();
  const [classList, setClassList] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [subject, setSubject] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-2027");

  const loadClasses = () => {
    startTransition(async () => {
      try {
        const data = await teacherApi.getClasses();
        setClassList(data || []);
      } catch (err) {
        console.error("Failed to load classes:", err);
      }
    });
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await teacherApi.createClass({
        name,
        section,
        subject,
        academicYear,
      });

      if (res.ok) {
        setName("");
        setSection("");
        setSubject("");
        setIsCreateOpen(false);
        loadClasses();
      }
    } catch (err: any) {
      alert(err?.message || "Failed to create class");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/teacher" className="text-muted-foreground hover:text-foreground p-1 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
              <GraduationCap className="w-7 h-7 text-primary" />
              Class Rosters & Sections
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage student enrollments, sections, and roster-based exam participation tracking
            </p>
          </div>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="font-semibold gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Create New Class
        </Button>
      </div>

      {/* Classes List Grid */}
      {isPending ? (
        <div className="py-20 text-center text-muted-foreground animate-pulse">
          Loading student classes...
        </div>
      ) : classList.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border rounded-2xl bg-muted/20 space-y-3">
          <Users className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
          <h3 className="text-base font-bold text-foreground">No Classes Created Yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Create classes to manage student rosters and calculate accurate participation metrics.
          </p>
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="mt-2 font-semibold"
          >
            Create Your First Class
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {classList.map((cls) => (
            <Card
              key={cls.id}
              className="border-border bg-card hover:border-border/80 transition-all flex flex-col justify-between shadow-sm"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  {cls.section ? (
                    <Badge variant="default" className="text-[10px]">
                      Section: {cls.section}
                    </Badge>
                  ) : (
                    <span />
                  )}
                  {cls.academicYear && (
                    <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-primary" />
                      {cls.academicYear}
                    </span>
                  )}
                </div>
                <CardTitle className="text-lg text-card-foreground font-bold">{cls.name}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {cls.subject || "No subject specified"}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-0">
                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <Link to={`/teacher/classes/${cls.id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full justify-between text-xs">
                      <span>View Class Roster</span>
                      <ArrowRight className="w-3.5 h-3.5 text-primary" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Class Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreate}
            className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in"
          >
            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h3 className="text-base font-bold text-card-foreground">Create Class & Section</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Class / Course Name *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Grade 10 - Advanced Physics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background border-input text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Section</label>
                  <Input
                    type="text"
                    placeholder="e.g. Section Diamond"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="bg-background border-input text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">Subject</label>
                  <Input
                    type="text"
                    placeholder="e.g. Physics"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="bg-background border-input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Academic Year</label>
                <Input
                  type="text"
                  placeholder="e.g. 2026-2027"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="bg-background border-input text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="font-semibold">
                Create Class
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
