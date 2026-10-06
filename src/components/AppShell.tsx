import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, CalendarDays, Check, Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { loadActivityLogs, type ActivityLog } from "@/lib/church-store";
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
  { to: "/staff", glyph: "♟", label: "Members", mm: "အသင်းသားများ", permission: "view-staff" },
  { to: "/finance", glyph: "₵", label: "Finance", mm: "ငွေစာရင်း", permission: "view-finance" },
  {
    to: "/events",
    glyph: <CalendarDays className="size-4" />,
    label: "Events",
    mm: "ပွဲများ",
    permission: "view-events",
  },
  {
    to: "/audit-logs",
    glyph: "≋",
    label: "Activity Logs",
    mm: "မှတ်တမ်း",
    permission: "view-audit-logs",
  },
] as const;

const notificationStorageKey = "hopa-read-notifications";
const activityRoutes = [
  "/students",
  "/attendance",
  "/courses",
  "/events",
  "/finance",
  "/teachers",
  "/staff",
  "/audit-logs",
] as const;

function activityId(log: ActivityLog, index: number) {
  const id =
    log.id ??
    [
      log.timestamp ?? log.createdAt ?? log.created_at ?? "activity",
      log.action ?? "action",
      log.resource ?? "resource",
      index,
    ].join("-");
  return String(id);
}

function activityTimestamp(log: ActivityLog) {
  return log.timestamp ?? log.createdAt ?? log.created_at;
}

function activityText(value: unknown) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isOperationalActivity(log: ActivityLog) {
  const searchable = [log.action, log.resource, activityText(log.details)].join(" ").toLowerCase();
  return /\b(attendance|students?|courses?|classes?|events?|finance|transactions?|teachers?|staff|members?)\b/.test(
    searchable,
  );
}

function activityRoute(
  log: ActivityLog,
  role: "ADMIN" | "STAFF",
): (typeof activityRoutes)[number] | "/" {
  const resource =
    `${log.resource ?? ""} ${log.action ?? ""} ${activityText(log.details)}`.toLowerCase();
  if (resource.includes("attendance")) return "/attendance";
  if (resource.includes("student")) return "/students";
  if (resource.includes("course") || resource.includes("class") || resource.includes("assign"))
    return "/courses";
  if (resource.includes("event")) return "/events";
  if (resource.includes("finance") || resource.includes("transaction")) return "/finance";
  if (resource.includes("teacher")) return "/teachers";
  if (resource.includes("staff") || resource.includes("member")) return "/staff";
  return role === "ADMIN" ? "/audit-logs" : "/";
}

function NotificationBell({ role }: { role: "ADMIN" | "STAFF" }) {
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [isOpen, setIsOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const storedIds = window.localStorage.getItem(notificationStorageKey);
    if (storedIds) {
      try {
        const parsed: unknown = JSON.parse(storedIds);
        setReadNotificationIds(
          Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [],
        );
      } catch {
        window.localStorage.removeItem(notificationStorageKey);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    loadActivityLogs()
      .then((records) => {
        if (!active) return;
        setLogs(records);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [role, reloadKey]);

  const visibleLogs = (role === "ADMIN" ? logs : logs.filter(isOperationalActivity))
    .map((log, index) => ({ log, id: activityId(log, index) }))
    .sort((a, b) => {
      const aTime = Date.parse(activityTimestamp(a.log) ?? "");
      const bTime = Date.parse(activityTimestamp(b.log) ?? "");
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    })
    .slice(0, 8);
  const unreadCount = visibleLogs.filter(({ id }) => !readNotificationIds.includes(id)).length;

  const markAsRead = (notificationId: string) => {
    const nextReadIds = [...new Set([...readNotificationIds, notificationId])];
    setReadNotificationIds(nextReadIds);
    window.localStorage.setItem(notificationStorageKey, JSON.stringify(nextReadIds));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative grid place-items-center p-0 text-[20px] leading-none text-[#f4c542] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          aria-label={`${unreadCount} unread notifications`}
        >
          <span aria-hidden="true">🔔</span>
          {unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} unread notifications`}
              className="absolute right-0 top-0 size-1.5 rounded-full bg-rose shadow-sm shadow-black/40"
            >
              <span className="sr-only">{unreadCount} unread notifications</span>
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
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-200">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-white/50">
              {role === "ADMIN" ? "Recent system-wide activity" : "Recent operational updates"}
            </p>
          </div>
          <Bell className="size-4 text-accent/80" strokeWidth={1.8} />
        </div>
        {status === "loading" ? (
          <p className="px-4 py-8 text-center text-xs text-white/55" role="status">
            Loading notifications…
          </p>
        ) : status === "error" ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-rose-200" role="alert">
              Unable to load notifications.
            </p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="mt-2 text-[11px] font-medium text-accent hover:underline"
            >
              Try again
            </button>
          </div>
        ) : visibleLogs.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Check className="mx-auto size-6 text-emerald-300" strokeWidth={1.6} />
            <p className="mt-2 text-sm font-medium">No recent notifications</p>
            <p className="mt-1 text-xs text-white/50">You&apos;re all caught up.</p>
          </div>
        ) : (
          <div className="max-h-[24rem] overflow-y-auto">
            {visibleLogs.map(({ log, id }) => {
              const timestamp = activityTimestamp(log);
              const title = log.action || log.resource || "System activity";
              const detail = [log.resource, activityText(log.details)].filter(Boolean).join(" · ");
              const isRead = readNotificationIds.includes(id);
              return (
                <Link
                  key={id}
                  to={activityRoute(log, role)}
                  onClick={() => {
                    markAsRead(id);
                    setIsOpen(false);
                  }}
                  className="block border-b border-white/8 px-4 py-3 transition-colors hover:bg-white/[0.06] last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                        isRead ? "bg-white/20" : "bg-accent"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-semibold leading-5 text-white/90">{title}</p>
                        <span className="shrink-0 text-[10px] text-white/40">
                          {timestamp && Number.isFinite(Date.parse(timestamp))
                            ? new Date(timestamp).toLocaleString()
                            : "Recent"}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-white/55">
                        {detail || "Open the related section to review this activity."}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
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
            {(role === "ADMIN" || role === "STAFF") && <NotificationBell role={role} />}
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
