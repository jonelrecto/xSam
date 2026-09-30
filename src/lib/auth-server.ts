import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Role } from "@/lib/permissions";

export const homeFor = (role: Role | string): string => {
  switch (role) {
    case "admin":
      return "/admin";
    case "teacher":
      return "/teacher";
    case "student":
    default:
      return "/student";
  }
};

export async function getSession() {
  try {
    const headersList = await headers();
    return await auth.api.getSession({ headers: headersList });
  } catch (error) {
    return null;
  }
}

export async function requireRole(allowed: Role[]) {
  const session = await getSession();

  if (!session || !session.user) {
    redirect("/login");
  }

  const userRole = ((session.user as Record<string, unknown>).role as Role) || "student";

  if (!allowed.includes(userRole)) {
    redirect(homeFor(userRole));
  }

  return session;
}
