import React, { useEffect, useState, useTransition } from "react";
import { useParams, Link } from "react-router-dom";
import { teacherApi } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Users,
  UserPlus,
  ArrowLeft,
  Mail,
} from "lucide-react";

export function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();

  const [isPending, startTransition] = useTransition();
  const [classData, setClassData] = useState<any>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [studentEmail, setStudentEmail] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [addError, setAddError] = useState("");

  const loadData = () => {
    if (!classId) return;
    startTransition(async () => {
      try {
        const data = await teacherApi.getClass(classId);
        setClassData(data);
      } catch (err) {
        console.error("Failed to load class:", err);
      }
    });
  };

  useEffect(() => {
    loadData();
  }, [classId]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    if (!studentEmail.trim() || !classId) return;

    try {
      const res = await teacherApi.addStudentToClass(classId, {
        studentEmail,
        studentNumber: studentNumber || undefined,
      });

      if (res.ok) {
        setStudentEmail("");
        setStudentNumber("");
        setIsAddOpen(false);
        loadData();
      }
    } catch (err: any) {
      setAddError(err?.message || "Failed to add student to class");
    }
  };

  if (!classData && isPending) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center text-muted-foreground animate-pulse">
        Loading class roster...
      </div>
    );
  }

  if (!classData && !isPending) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center text-muted-foreground space-y-3">
        <p>Class not found.</p>
        <Link to="/teacher/classes">
          <Button variant="outline">Return to Classes</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/teacher/classes" className="text-muted-foreground hover:text-foreground p-1 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              {classData.section && (
                <Badge variant="default" className="text-[10px]">
                  Section: {classData.section}
                </Badge>
              )}
              {classData.academicYear && (
                <span className="text-xs text-muted-foreground font-mono">
                  {classData.academicYear}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {classData.name}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {classData.subject || "No subject specified"} • {classData.members?.length || 0} enrolled students
            </p>
          </div>
        </div>

        <Button
          onClick={() => setIsAddOpen(true)}
          className="font-semibold gap-1.5"
        >
          <UserPlus className="w-4 h-4" />
          Enroll Student
        </Button>
      </div>

      {/* Roster Table Card */}
      <Card className="border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="p-5 border-b border-border bg-muted/30">
          <CardTitle className="text-base text-card-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Class Roster
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            List of registered students associated with this class section
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {!classData.members || classData.members.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <Users className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
              <p className="text-sm font-semibold text-foreground">No Students Enrolled Yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Add registered students by their email address and student number to build the class roster.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase font-mono text-[10px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Student Number</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Enrolled Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {classData.members.map((m: any, idx: number) => (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-muted-foreground">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-foreground">{m.name}</td>
                      <td className="py-3 px-4 font-mono text-primary font-semibold">
                        {m.studentNumber || "—"}
                      </td>
                      <td className="py-3 px-4 text-foreground flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        {m.email}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                        {new Date(m.joinedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enroll Student Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleAddStudent}
            className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in"
          >
            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <UserPlus className="w-5 h-5 text-primary" />
              <h3 className="text-base font-bold text-card-foreground">Enroll Student into Class</h3>
            </div>

            {addError && (
              <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-medium">
                {addError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Student Account Email *
                </label>
                <Input
                  type="email"
                  placeholder="student@school.edu"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="bg-background border-input text-xs"
                  required
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  The student must have an existing registered student account.
                </p>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Student Number / ID (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 2024-00123"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  className="bg-background border-input text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="font-semibold">
                Enroll Student
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
