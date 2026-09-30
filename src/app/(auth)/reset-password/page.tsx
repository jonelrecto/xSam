"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@/lib/auth-client";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/schemas/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Shield, CheckCircle2, AlertCircle } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setServerError(null);
    setIsLoading(true);

    if (!token) {
      setServerError("Reset token is missing or invalid. Please request a new link.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await authClient.resetPassword({
        newPassword: data.password,
        token,
      });

      if (res?.error) {
        setServerError(res.error.message || "Failed to reset password. The link may have expired.");
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setIsLoading(false);
    } catch (err: any) {
      setServerError(err?.message || "An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
      {isSuccess ? (
        <CardContent className="pt-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Password Updated</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Your password has been changed successfully. You can now sign in with your new credentials.
          </p>
          <div className="pt-2">
            <Link href="/login">
              <Button className="w-full font-semibold">Sign In Now</Button>
            </Link>
          </div>
        </CardContent>
      ) : (
        <>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-slate-200">
              Set New Password
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Choose a strong password with at least 8 characters, letters, and numbers
            </CardDescription>
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
                <Label htmlFor="password" required>
                  New Password
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
                  Confirm New Password
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Repeat new password"
                  error={errors.confirm?.message}
                  {...register("confirm")}
                />
              </div>

              <Button
                type="submit"
                className="w-full mt-2 font-semibold"
                isLoading={isLoading}
              >
                Update Password
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center text-xs text-slate-400">
            <Link
              href="/login"
              className="text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Return to Sign In
            </Link>
          </CardFooter>
        </>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-3xl pointer-events-none rounded-full" />

      <div className="w-full max-w-md z-10 space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              XSAM <span className="text-xs font-mono text-indigo-400 font-bold px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-800/60">SEPE</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-white tracking-tight">Create New Password</h2>
          <p className="text-xs text-slate-400">
            Secure token verification in progress
          </p>
        </div>

        <Suspense fallback={<div className="text-center text-slate-400">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
