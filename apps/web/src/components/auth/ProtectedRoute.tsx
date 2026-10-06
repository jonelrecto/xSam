import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "../../lib/auth-client";
import type { Role } from "@xsam/shared";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { data: session, isPending } = useSession();
  const location = useLocation();

  if (isPending) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || !session.user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = ((session.user as any).role as Role) || "student";

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Redirect to their respective role home
    if (userRole === "teacher") return <Navigate to="/teacher" replace />;
    if (userRole === "student") return <Navigate to="/student" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
