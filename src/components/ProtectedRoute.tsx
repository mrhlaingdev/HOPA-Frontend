import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { hasPermission, roleLabel, useCurrentRole, type Permission } from "@/lib/auth";

const routePermissions: Array<{ prefix: string; permission: Permission }> = [
  { prefix: "/finance", permission: "view-finance" },
  { prefix: "/students", permission: "view-students" },
  { prefix: "/attendance", permission: "view-attendance" },
  { prefix: "/courses", permission: "view-courses" },
];

function permissionForPath(pathname: string): Permission {
  return routePermissions.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    ?.permission ?? "view-dashboard";
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const role = useCurrentRole();
  const permission = permissionForPath(pathname);

  if (hasPermission(role, permission)) return children;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <section className="glass max-w-md rounded-2xl p-8 text-center">
        <p className="text-sm font-medium text-rose">403 Access Denied</p>
        <h1 className="mt-2 font-display text-2xl font-semibold">You do not have access to this page</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your current role, {roleLabel(role)}, does not include permission to view this section.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-xl gradient-brand px-4 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Return to Dashboard
        </Link>
      </section>
    </main>
  );
}