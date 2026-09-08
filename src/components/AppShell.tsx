import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  hasPermission,
  roleLabel,
  roles,
  setCurrentRole,
  useCurrentRole,
  usePermission,
} from "@/lib/auth";

const nav = [
  { to: "/", glyph: "◈", label: "Overview", mm: "အကျဉ်း", permission: "view-dashboard" },
  { to: "/students", glyph: "◔", label: "Students", mm: "ကျောင်းသား", permission: "view-students" },
  {
    to: "/attendance",
    glyph: "▤",
    label: "Attendance",
    mm: "တက်ရောက်မှု",
    permission: "view-attendance",
  },
  { to: "/courses", glyph: "▣", label: "Courses", mm: "သင်တန်း", permission: "view-courses" },
  { to: "/finance", glyph: "₵", label: "Finance", mm: "ငွေစာရင်း", permission: "view-finance" },
] as const;

const notificationStorageKey = "hopa-read-notifications";
const notifications = [
  {
    id: "student-registered",
    title: "New student registered",
    detail: "Thazin Moe joined Grade 4 Sunday School.",
    timestamp: "2 min ago",
  },
  {
    id: "fee-payment-recorded",
    title: "Fee payment recorded",
    detail: "A payment of $45.00 was added to the finance ledger.",
    timestamp: "18 min ago",
  },
  {
    id: "system-update",
    title: "System update available",
    detail: "The attendance reporting workflow has been updated.",
    timestamp: "1 hr ago",
  },
] as const;

function NotificationBell() {
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);

  useEffect(() => {
    const storedIds = window.localStorage.getItem(notificationStorageKey);
    if (storedIds) {
      try {
        setReadNotificationIds(JSON.parse(storedIds) as string[]);
      } catch {
        window.localStorage.removeItem(notificationStorageKey);
      }
    }
  }, []);

  const unreadNotifications = notifications.filter(
    (notification) => !readNotificationIds.includes(notification.id),
  );

  const markAsRead = (notificationId: string) => {
    const nextReadIds = [...new Set([...readNotificationIds, notificationId])];
    setReadNotificationIds(nextReadIds);
    window.localStorage.setItem(notificationStorageKey, JSON.stringify(nextReadIds));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="glass rounded-xl size-10 grid place-items-center relative text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`${unreadNotifications.length} unread notifications`}
        >
          <Bell className="size-4" />
          {unreadNotifications.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-rose px-1 text-[10px] leading-4 text-white">
              {unreadNotifications.length > 9 ? "9+" : unreadNotifications.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-[11px] text-muted-foreground">
              {unreadNotifications.length} unread alert{unreadNotifications.length === 1 ? "" : "s"}
            </p>
          </div>
          <Bell className="size-4 text-muted-foreground" />
        </div>
        {unreadNotifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Check className="mx-auto size-6 text-emerald-400" />
            <p className="mt-2 text-sm font-medium">No new notifications</p>
            <p className="mt-1 text-xs text-muted-foreground">You&apos;re all caught up.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {unreadNotifications.map((notification) => (
              <div key={notification.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {notification.detail}
                    </p>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {notification.timestamp}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => markAsRead(notification.id)}
                    className="shrink-0 text-[11px] font-medium text-primary hover:underline"
                  >
                    Mark as Read
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

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
          {nav
            .filter((n) => hasPermission(role, n.permission))
            .map((n) => {
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
                to="/students"
                search={{ q: "" }}
                className="glass rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2"
              >
                + Quick Add
              </Link>
            )}
            <NotificationBell />
            <div
              className="glass rounded-xl p-1 flex items-center gap-1"
              aria-label="UAT role switcher"
              role="group"
            >
              {roles.map((availableRole) => {
                const active = role === availableRole;
                return (
                  <button
                    key={availableRole}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCurrentRole(availableRole)}
                    className={
                      active
                        ? "rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground"
                        : "rounded-lg px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                    }
                  >
                    {roleLabel(availableRole)}
                  </button>
                );
              })}
            </div>
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
