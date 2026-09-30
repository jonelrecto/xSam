"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getClassWithMembers, addMemberToClassAction } from "@/app/actions/classes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserPlus,
  ArrowLeft,
  GraduationCap,
  Mail,
  Hash,
  Calendar,
  CheckCircle2,
} from "lucide-react";

export default function ClassDetailsPage() {
  const params = useParams();
  const classId = params.classId as string;

  const [isPending, startTransition] = useTransition();
  const [classData, setClassData] = useState<any>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [studentEmail, setStudentEmail] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [addError, setAddError] = useState("");

  const loadData = () => {
    startTransition(async () => {
      const data = await getClassWithMembers(classId);
      setClassData(data);
    });
  };

  useEffect(() => {
    if (classId) loadData();
  }, [classId]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    if (!studentEmail.trim()) return;

    const res = await addMemberToClassAction(classId, studentEmail, studentNumber);
    if (res.ok) {
      setStudentEmail("");
      setStudentNumber("");
      setIsAddOpen(false);
      loadData();
    } else {
      setAddError(res.error || "Failed to add student to class");
    }
  };

  if (!classData && isPending) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center text-slate-400 animate-pulse">
        Loading class roster...
      </div>
    );
  }

  if (!classData && !isPending) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center text-slate-400 space-y-3">
        <p>Class not found.</p>
        <Link href="/teacher/classes">
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
          <Link href="/teacher/classes" className="text-slate-400 hover:text-white p-1">
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
                <span className="text-xs text-slate-400 font-mono">
                  {classData.academicYear}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {classData.name}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {classData.subject || "No subject specified"} • {classData.members?.length || 0} enrolled students
            </p>
          </div>
        </div>

        <Button
          onClick={() => setIsAddOpen(true)}
          className="font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          <UserPlus className="w-4 h-4" />
          Enroll Student
        </Button>
      </div>

      {/* Roster Table Card */}
      <Card className="border-slate-800 bg-slate-900/80 shadow-xl overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-800/80 bg-slate-950/40">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            Class Roster
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            List of registered students associated with this class section
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {!classData.members || classData.members.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Users className="w-10 h-10 text-slate-600 mx-auto opacity-50" />
              <p className="text-sm font-semibold text-white">No Students Enrolled Yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Add registered students by their email address and student number to build the class roster.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase font-mono text-[10px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Student Number</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Enrolled Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {classData.members.map((m: any, idx: number) => (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-white">{m.name}</td>
                      <td className="py-3 px-4 font-mono text-indigo-300">
                        {m.studentNumber || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-300 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        {m.email}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleAddStudent}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in"
          >
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Enroll Student into Class</h3>
            </div>

            {addError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
                {addError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Student Account Email *
                </label>
                <Input
                  type="email"
                  placeholder="student@school.edu"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  The student must have an existing registered student account.
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Student Number / ID (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 2024-00123"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-indigo-600 text-white font-semibold">
                Enroll Student
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
