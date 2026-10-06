import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider, ThemeScript } from "@/components/ThemeProvider";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="bg-background text-foreground min-h-screen antialiased selection:bg-primary selection:text-primary-foreground">
        <ThemeProvider defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
