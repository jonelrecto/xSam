import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, MailCheck, ArrowRight } from "lucide-react";

export default function VerifyEmailPage() {
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
          <h2 className="text-xl font-bold text-white tracking-tight">Verify Your Email</h2>
          <p className="text-xs text-slate-400">
            Account activation link has been dispatched
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
          <CardHeader className="pb-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <MailCheck className="w-7 h-7" />
            </div>
            <CardTitle className="text-lg font-bold text-white">
              Check Your Inbox
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 max-w-xs mx-auto">
              We have sent a verification link to your registered email address. Please click the link to confirm your account and proceed.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-2">
              <p className="font-semibold text-slate-300">Didn&apos;t receive an email?</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Check your spam or junk folder.</li>
                <li>In local development, check your terminal server logs.</li>
              </ul>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2">
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full">
                Proceed to Sign In
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
