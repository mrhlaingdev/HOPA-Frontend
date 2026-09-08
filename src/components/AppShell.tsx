import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { hasPermission, roleLabel, useCurrentRole, usePermission } from "@/lib/auth";

const nav = [
  { to: "/", glyph: "◈", label: "Overview", mm: "အကျဉ်း", permission: "view-dashboard" },
  { to: "/students", glyph: "◔", label: "Students", mm: "ကျောင်းသား", permission: "view-students" },
  { to: "/attendance", glyph: "▤", label: "Attendance", mm: "တက်ရောက်မှု", permission: "view-attendance" },
  { to: "/courses", glyph: "▣", label: "Courses", mm: "သင်တန်း", permission: "view-courses" },
  { to: "/finance", glyph: "₵", label: "Finance", mm: "ငွေစာရင်း", permission: "view-finance" },
] as const;

export function AppShell({
  children,
  search,
  onSearch,
}: {
  children: ReactNode;
  search?: string;
  onSearch?: (v: string) => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const role = useCurrentRole();
  const canQuickAdd = usePermission("manage-students");

  return (
    <div className="relative flex min-h-screen w-full">
      <aside className="hidden lg:flex w-[248px] shrink-0 flex-col gap-6 p-5">
        <div className="flex items-center gap-3 px-2">
          <div className="size-10 rounded-xl grid place-items-center gradient-brand font-display font-bold text-lg text-primary-foreground">
            L
          </div>
          <div>
            <p className="font-display font-semibold leading-tight">House Of Prayer Assembly</p>
            <p className="text-[11px] text-muted-foreground tracking-wide">Sunday School OS</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {nav.filter((n) => hasPermission(role, n.permission)).map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={
                  active
                    ? "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium border border-primary/40 bg-linear-[120deg] from-primary/35 to-accent/20"
                    : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-white/5"
                }
              >
                <span className={active ? "text-accent" : "opacity-50"}>{n.glyph}</span>
                {n.label}
                <span className="ml-auto text-[10px] opacity-60">{n.mm}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto glass rounded-2xl p-4">
          <p className="text-sm font-medium">Grace Chapel</p>
          <p className="text-[11px] text-muted-foreground">North Branch · 2026</p>
          <div className="mt-3 h-1.5 rounded-full bg-white/10">
            <div className="h-full w-3/4 rounded-full gradient-brand" />
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">82% of storage used</p>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="glass rounded-2xl mx-5 mt-5 px-5 py-3.5 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                value={search ?? ""}
                onChange={(e) => onSearch?.(e.target.value)}
                readOnly={!onSearch}
                className="field w-64 pl-9 pr-3 py-2.5 text-sm"
                placeholder="Search students, courses, receipts…"
                aria-label="Global search"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                ⌕
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">ရှာဖွေရန်</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {canQuickAdd && (
              <Link
                to="/students" search={{ q: "" }}
                className="glass rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2"
              >
                + Quick Add
              </Link>
            )}
            <button
              type="button"
              className="glass rounded-xl size-10 grid place-items-center relative text-muted-foreground"
              aria-label="Notifications"
            >
              🔔
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-rose" />
            </button>
            <div className="flex items-center gap-2.5 pl-1">
              <div className="size-9 rounded-full grid place-items-center gradient-violet text-xs font-semibold">
                MK
              </div>
              <div className="leading-tight">
                <p className="text-sm font-medium">Win Hlaing Htun</p>
                <p className="text-[11px] text-muted-foreground">{roleLabel(role)}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-5">{children}</div>
      </main>
    </div>
  );
}

export function Panel({
  title,
  mm,
  right,
  className,
  children,
}: {
  title: string;
  mm?: string;
  right?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`glass rounded-2xl p-5 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold">{title}</h2>
          {mm ? <p className="text-[11px] text-muted-foreground">{mm}</p> : null}
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
