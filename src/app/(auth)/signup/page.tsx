"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@/lib/auth-client";
import { signupSchema, type SignupInput } from "@/lib/schemas/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Shield, GraduationCap, School, ArrowRight, AlertCircle } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: "student",
      name: "",
      email: "",
      password: "",
      confirm: "",
    },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: SignupInput) => {
    setServerError(null);
    setIsLoading(true);

    try {
      const res = await authClient.signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      } as any);

      if (res?.error) {
        setServerError(res.error.message || "Failed to create account. Please try again.");
        setIsLoading(false);
        return;
      }

      // Check if email verification is active
      const requiresVerification = process.env.NEXT_PUBLIC_REQUIRE_EMAIL_VERIFICATION === "true";
      if (requiresVerification) {
        router.push("/verify-email");
      } else {
        router.push(data.role === "teacher" ? "/teacher" : "/student");
      }
      router.refresh();
    } catch (err: any) {
      setServerError(err?.message || "An unexpected error occurred during signup.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-3xl pointer-events-none rounded-full" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              XSAM <span className="text-xs font-mono text-indigo-400 font-bold px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-800/60">SEPE</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-white tracking-tight">Create your account</h2>
          <p className="text-xs text-slate-400">
            Join the Secure Exam & Proctoring Environment
          </p>
        </div>

        {/* Signup Card */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-slate-200">
              Select Your Role
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Choose how you will be using the XSAM platform
            </CardDescription>

            {/* Role Selection Cards */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setValue("role", "student")}
                className={`p-3.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                  selectedRole === "student"
                    ? "border-indigo-500 bg-indigo-950/40 text-white shadow-lg shadow-indigo-500/10"
                    : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${
                    selectedRole === "student"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold block">Student</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Take Exams</span>
              </button>

              <button
                type="button"
                onClick={() => setValue("role", "teacher")}
                className={`p-3.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                  selectedRole === "teacher"
                    ? "border-indigo-500 bg-indigo-950/40 text-white shadow-lg shadow-indigo-500/10"
                    : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${
                    selectedRole === "teacher"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  <School className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold block">Teacher</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Author & Proctor</span>
              </button>
            </div>
          </CardHeader>

          <CardContent>
            {serverError && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name" required>
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g. Maria Santos"
                  error={errors.name?.message}
                  {...register("name")}
                />
              </div>

              <div>
                <Label htmlFor="email" required>
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@institution.edu"
                  error={errors.email?.message}
                  {...register("email")}
                />
              </div>

              <div>
                <Label htmlFor="password" required>
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  error={errors.password?.message}
                  {...register("password")}
                />
              </div>

              <div>
                <Label htmlFor="confirm" required>
                  Confirm Password
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Repeat your password"
                  error={errors.confirm?.message}
                  {...register("confirm")}
                />
              </div>

              <Button
                type="submit"
                className="w-full mt-2 font-semibold"
                isLoading={isLoading}
              >
                Create {selectedRole === "teacher" ? "Teacher" : "Student"} Account
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center text-xs text-slate-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-indigo-400 hover:text-indigo-300 font-semibold ml-1.5 transition-colors"
            >
              Sign In
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
