import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XSAM / SEPE — Secure Exam & Proctoring Environment",
  description:
    "End-to-end examination platform designed for strict academic integrity, resilient offline-first execution, and transparent proctoring.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
