import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Check, Menu, X } from "lucide-react";
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
  { to: "/teachers", glyph: "♙", label: "Teachers", mm: "ဆရာများ", permission: "view-teachers" },
  { to: "/staff", glyph: "♟", label: "Staff", mm: "ဝန်ထမ်း", permission: "view-staff" },
  { to: "/finance", glyph: "₵", label: "Finance", mm: "ငွေစာရင်း", permission: "view-finance" },
  { to: "/audit-logs", glyph: "≋", label: "Activity Logs", mm: "မှတ်တမ်း", permission: "view-audit-logs" },
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
          className="relative grid place-items-center p-0 text-[20px] leading-none text-[#f4c542] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          aria-label={`${unreadNotifications.length} unread notifications`}
        >
          <span aria-hidden="true">🔔</span>
          {unreadNotifications.length > 0 && (
            <span
              aria-label={`${unreadNotifications.length} unread notifications`}
              className="absolute right-0 top-0 size-1.5 rounded-full bg-rose shadow-sm shadow-black/40"
            >
              <span className="sr-only">{unreadNotifications.length} unread notifications</span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[rgb(24_29_54_/_0.94)] p-0 text-white shadow-2xl shadow-black/40 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold tracking-tight">Notifications</p>
              {unreadNotifications.length > 0 && (
                <span className="rounded-full bg-rose/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-200">
                  {unreadNotifications.length} new
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-white/50">Recent system activity</p>
          </div>
          <Bell className="size-4 text-accent/80" strokeWidth={1.8} />
        </div>
        {unreadNotifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Check className="mx-auto size-6 text-emerald-300" strokeWidth={1.6} />
            <p className="mt-2 text-sm font-medium">No new notifications</p>
            <p className="mt-1 text-xs text-white/50">You&apos;re all caught up.</p>
          </div>
        ) : (
          <div>
            {unreadNotifications.map((notification) => (
              <div
                key={notification.id}
                className="border-b border-white/8 px-4 py-3 last:border-b-0"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-semibold leading-5 text-white/90">
                        {notification.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-white/40">
                        {notification.timestamp}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-4 text-white/55">
                      {notification.detail}
                    </p>
                    <button
                      type="button"
                      onClick={() => markAsRead(notification.id)}
                      className="mt-2 text-[10px] font-medium text-accent/90 transition-colors hover:text-accent hover:underline"
                    >
                      Mark as read
                    </button>
                  </div>
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(82vw,18rem)] flex-col gap-6 bg-[rgb(20_24_48_/_0.98)] p-5 shadow-2xl shadow-black/50 backdrop-blur-xl transition-transform duration-200 lg:hidden ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-hidden={!mobileNavOpen}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 px-2">
            <div className="grid size-10 place-items-center rounded-xl gradient-brand font-display text-lg font-bold text-primary-foreground">L</div>
            <div>
              <p className="font-display font-semibold leading-tight">House Of Prayer Assembly</p>
              <p className="text-[11px] tracking-wide text-muted-foreground">Sunday School OS</p>
            </div>
          </div>
          <button type="button" className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-white/10 hover:text-foreground" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}>
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.filter((item) => hasPermission(role, item.permission)).map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileNavOpen(false)}
                className={active ? "flex items-center gap-3 rounded-xl border border-primary/40 bg-linear-[120deg] from-primary/35 to-accent/20 px-3 py-2.5 text-sm font-medium" : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"}
              >
                <span className={active ? "text-accent" : "opacity-50"}>{item.glyph}</span>
                {item.label}
                <span className="ml-auto text-[10px] opacity-60">{item.mm}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="glass mx-3 mt-3 flex items-center gap-3 rounded-2xl px-3 py-3 sm:mx-5 sm:mt-5 sm:px-5 sm:py-3.5">
          <button type="button" className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-white/10 hover:text-foreground lg:hidden" aria-label="Open navigation" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(true)}>
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                value={search ?? ""}
                onChange={(e) => onSearch?.(e.target.value)}
                readOnly={!onSearch}
                className="field w-[min(48vw,16rem)] pl-9 pr-3 py-2.5 text-sm sm:w-64"
                placeholder="Search students, courses, receipts…"
                aria-label="Global search"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                ⌕
              </span>
            </div>
            <span className="hidden text-[11px] text-muted-foreground sm:inline">ရှာဖွေရန်</span>
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
              <div className="hidden sm:flex items-center gap-1">
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
            </div>
            <div className="hidden items-center gap-2.5 pl-1 sm:flex">
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

        <div className="p-3 sm:p-5">{children}</div>
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
