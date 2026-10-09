import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  BookOpenCheck,
  ClipboardCheck,
  Download,
  GraduationCap,
  Receipt,
  RotateCcw,
  UserPlus,
  UserRoundPlus,
  Users,
  UsersRound,
} from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { DateFilters } from "@/components/DateFilters";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CHURCH_LEADERSHIP } from "@/lib/constants/leadership";
import {
  ALL_DATE_FILTER,
  formatApiError,
  loadDashboardStats,
  loadEvents,
  matchesDate,
  monthlyTotals,
  parseSystemBackup,
  restoreSystemBackup,
  useChurch,
  type SystemBackup,
  type DashboardStats,
} from "@/lib/church-store";
import {
  type ChurchEvent,
  formatShortThb,
  parseNumericValue,
} from "@/lib/church-data";
import { usePermission } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard Overview — House Of Prayer Assembly Sunday School OS" },
      {
        name: "description",
        content:
          "Church and Sunday School dashboard: student totals, active courses, monthly offerings, expenses and net balance at a glance.",
      },
      {
        property: "og:title",
        content: "Dashboard Overview — House Of Prayer Assembly Sunday School OS",
      },
      {
        property: "og:description",
        content:
          "Track Sunday School students, weekly attendance, training courses and petty cash in one place.",
      },
    ],
  }),
  component: Overview,
});

function DashboardCardBackground({
  image,
  imageClassName = "opacity-[0.15] group-hover:opacity-25",
  overlayClassName = "bg-slate-950/85",
}: {
  image: string;
  imageClassName?: string;
  overlayClassName?: string;
}) {
  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-cover bg-center transition-opacity duration-300 ${imageClassName}`}
        style={{ backgroundImage: `url(${image})` }}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 ${overlayClassName}`}
      />
    </>
  );
}

function Overview() {
  const canViewFinance = usePermission("view-finance");
  const {
    students: storedStudents,
    teachers: storedTeachers,
    staff: storedStaff,
    courses: storedCourses,
    attendance: storedAttendance,
    completions: storedCompletions,
    txns: storedTxns,
    isLoading,
  } = useChurch();
  const students = storedStudents?.filter(Boolean) || [];
  const teachers = storedTeachers?.filter(Boolean) || [];
  const staff = storedStaff?.filter(Boolean) || [];
  const activeTeachersCount = teachers.filter((teacher) => teacher.active !== false).length;
  const activeMembersCount = staff.filter((member) => member.active !== false).length;
  const courses = storedCourses?.filter(Boolean) || [];
  const attendance = storedAttendance?.filter(Boolean) || [];
  const completions = storedCompletions?.filter(Boolean) || [];
  const txns = storedTxns?.filter(Boolean) || [];
  const [dateFilter, setDateFilter] = useState(ALL_DATE_FILTER);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [areEventsLoading, setAreEventsLoading] = useState(true);
  const [eventLoadError, setEventLoadError] = useState("");
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<SystemBackup | null>(null);
  const backupFileInput = useRef<HTMLInputElement>(null);
  const canManageSystem = usePermission("delete-records");
  const canManageRecords = usePermission("manage-students");
  const displayedDashboardStats = dashboardStats ?? {
    totalStudents: students.length,
    totalTeachers: teachers.length,
    totalStaff: staff.length,
    maleStudents: students.filter((student) => student.gender === "Male").length,
    femaleStudents: students.filter((student) => student.gender === "Female").length,
    maleTeachers: teachers.filter((teacher) => teacher.gender === "Male").length,
    femaleTeachers: teachers.filter((teacher) => teacher.gender === "Female").length,
    maleStaff: staff.filter((member) => member.gender === "Male").length,
    femaleStaff: staff.filter((member) => member.gender === "Female").length,
  };

  useEffect(() => {
    let active = true;
    loadDashboardStats()
      .then((stats) => {
        if (active) setDashboardStats(stats);
      })
      .catch((error: unknown) => {
        console.error("Unable to load dashboard stats", error);
        toast.error(formatApiError(error, "Unable to load dashboard stats"));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadEvents()
      .then((result) => {
        if (active) setEvents(result);
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = formatApiError(error, "Unable to load event finances");
        setEventLoadError(message);
        console.error(message, error);
        toast.error(message);
      })
      .finally(() => {
        if (active) setAreEventsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Total Students အတွက် စနစ်ထဲရှိသမျှ ကျောင်းသားအကုန်လုံးကို ယူပါမည်
  // Active Courses အတွက် Archived မဖြစ်သေးသော သင်တန်းများကို ရေတွက်ပါမည်
  /* Line 59 ကို ဒီအတိုင်း လဲပေးပါ */
  const activeCoursesCount = courses.filter((c) => !(c as any)?.archived).length;

  const completedInPeriod = completions.filter(
    (completion) => completion?.date && matchesDate(completion.date, dateFilter),
  ).length;

  const month = monthlyTotals(txns || [], dateFilter) || {
    income: 0,
    expense: 0,
    net: 0,
    rows: [],
  };
  const filteredEvents = events.filter((event) => matchesDate(event.date, dateFilter));
  const eventExpenses = filteredEvents.reduce(
    (sum, event) => sum + (parseNumericValue(event.totalExpense) ?? 0),
    0,
  );
  const eventDonations = filteredEvents.reduce(
    (sum, event) => sum + (parseNumericValue(event.donations) ?? 0),
    0,
  );
  const totalIncome = month.income + eventDonations;
  const totalExpense = month.expense + eventExpenses;
  const netBalance = totalIncome - totalExpense;
  async function downloadFullBackup() {
    setIsBackupLoading(true);
    try {
      const events = await loadEvents();
      const backup = {
        format: "hopa-full-backup" as const,
        version: 1 as const,
        createdAt: new Date().toISOString(),
        data: {
          students,
          teachers,
          staff,
          courses,
          attendance,
          completions,
          finance: txns,
          events,
        },
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hopa_backup_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success("Full system backup downloaded.");
    } catch (error) {
      toast.error(formatApiError(error, "Unable to download full backup"));
    } finally {
      setIsBackupLoading(false);
    }
  }

  async function selectBackupFile(file?: File) {
    if (!file) return;
    try {
      const backup = parseSystemBackup(JSON.parse(await file.text()) as unknown);
      setPendingBackup(backup);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to read backup file.");
    } finally {
      if (backupFileInput.current) backupFileInput.current.value = "";
    }
  }

  async function confirmRestoreBackup() {
    if (!pendingBackup) return;
    setIsRestoringBackup(true);
    try {
      await restoreSystemBackup(pendingBackup);
      setPendingBackup(null);
      toast.success("System data restored successfully.");
    } catch (error) {
      toast.error(formatApiError(error, "Unable to restore system data"));
    } finally {
      setIsRestoringBackup(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Overview</h1>
          <p className="text-[11px] text-muted-foreground">Church &amp; Sunday School Dashboard</p>
        </div>
        <DateFilters
          value={dateFilter}
          onChange={setDateFilter}
          dates={[
            ...students.map((student) => student.enrolled).filter(Boolean),
            ...courses.map((course) => course.date).filter(Boolean),
            ...txns.map((txn) => txn.date).filter(Boolean),
            ...completions.map((completion) => completion.date).filter(Boolean),
          ]}
        />
      </div>

      <Panel
        title="Church Leadership"
        mm="Leadership team"
        className="mb-4 border border-slate-400/15 border-l-2 border-l-indigo-300/60 border-t-indigo-300/30 bg-gradient-to-br from-indigo-950/25 via-slate-900/70 to-slate-900/60 shadow-[0_0_28px_rgba(129,140,248,0.05)] backdrop-blur-xl"
        right={
          <span className="rounded-full border border-indigo-300/20 bg-indigo-300/10 px-2.5 py-1 text-[10px] font-medium text-indigo-200">
            HOPA
          </span>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Senior Pastor", value: CHURCH_LEADERSHIP.seniorPastor },
            { label: "Associate Pastor", value: CHURCH_LEADERSHIP.associatePastor },
            { label: "Head Teacher", value: CHURCH_LEADERSHIP.headTeacher },
            { label: "Church Name", value: CHURCH_LEADERSHIP.churchName },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-indigo-300/10 bg-slate-950/35 p-3">
              <p className="text-[10px] font-medium uppercase text-indigo-200/80">{label}</p>
              <p className="mt-2 text-sm font-medium text-slate-100">{value}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="space-y-4">
        <section aria-label="People statistics">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="glass group relative isolate overflow-hidden rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-950/25 to-slate-900/70 p-5 shadow-[0_0_24px_rgba(34,211,238,0.05)] backdrop-blur-xl">
              <DashboardCardBackground
                image="https://www.naesp.org/wp-content/uploads/2023/03/SO23_0010_StudentUnique_2040160271.jpg"
                imageClassName="opacity-35 group-hover:opacity-50"
                overlayClassName="bg-slate-950/50"
              />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-300">Total Students</p>
                  <p className="mt-3 text-4xl font-display font-bold leading-none text-white">
                    {displayedDashboardStats.totalStudents}
                  </p>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-cyan-200">
                  <Users className="size-5" aria-hidden="true" />
                </span>
              </div>
              <div className="relative z-10 mt-4 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-cyan-300" />
                <p className="text-xs text-slate-300">
                  {displayedDashboardStats.maleStudents} Male{" "}
                  <span className="px-1 text-slate-500">•</span>
                  {displayedDashboardStats.femaleStudents} Female
                </p>
              </div>
              <p className="relative z-10 mt-2 text-[11px] text-slate-500">All registered students</p>
              <div className="relative z-10 mt-4">
                <Link
                  to="/students"
                  search={{ q: "" }}
                  className="block w-full rounded-md border border-white/10 bg-slate-800/80 py-2 text-center text-sm font-medium text-slate-100 transition-colors hover:bg-slate-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
                >
                  View details
                </Link>
              </div>
            </div>
            <div className="glass group relative isolate overflow-hidden rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-emerald-950/25 to-slate-900/70 p-5 shadow-[0_0_24px_rgba(52,211,153,0.05)] backdrop-blur-xl">
              <DashboardCardBackground image="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=800&auto=format&fit=crop" />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-300">Total Teachers</p>
                  <p className="mt-3 text-4xl font-display font-bold leading-none text-white">
                    {displayedDashboardStats.totalTeachers}
                  </p>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-emerald-300/30 bg-emerald-400/10 text-emerald-200">
                  <GraduationCap className="size-5" aria-hidden="true" />
                </span>
              </div>
              <div className="relative z-10 mt-4 flex items-center gap-2">
                <p className="text-xs text-slate-300">
                  {displayedDashboardStats.maleTeachers} Male{" "}
                  <span className="px-1 text-slate-500">•</span>
                  {displayedDashboardStats.femaleTeachers} Female
                </p>
              </div>
              <div className="relative z-10 mt-2 flex items-center gap-2">
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                  {activeTeachersCount} active
                </span>
                <span className="text-[11px] text-slate-400">
                  {teachers.length - activeTeachersCount} inactive
                </span>
              </div>
              <div className="relative z-10 mt-4">
                <Link
                  to="/teachers"
                  className="block w-full rounded-md border border-white/10 bg-slate-800/80 py-2 text-center text-sm font-medium text-slate-100 transition-colors hover:bg-slate-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50"
                >
                  View details
                </Link>
              </div>
            </div>
            <div className="glass group relative isolate overflow-hidden rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-950/20 to-slate-900/70 p-5 shadow-[0_0_24px_rgba(34,211,238,0.05)] backdrop-blur-xl">
              <DashboardCardBackground image="https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=800&auto=format&fit=crop" />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-300">Total Members</p>
                  <p className="mt-3 text-4xl font-display font-bold leading-none text-white">
                    {displayedDashboardStats.totalStaff}
                  </p>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-cyan-200">
                  <UsersRound className="size-5" aria-hidden="true" />
                </span>
              </div>
              <div className="relative z-10 mt-4 flex items-center gap-2">
                <p className="text-xs text-slate-300">
                  {displayedDashboardStats.maleStaff} Male{" "}
                  <span className="px-1 text-slate-500">•</span>
                  {displayedDashboardStats.femaleStaff} Female
                </p>
              </div>
              <div className="relative z-10 mt-2 flex items-center gap-2">
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-medium text-cyan-200">
                  {activeMembersCount} active
                </span>
                <span className="text-[11px] text-slate-400">
                  {staff.length - activeMembersCount} inactive
                </span>
              </div>
              <div className="relative z-10 mt-4">
                <Link
                  to="/staff"
                  className="block w-full rounded-md border border-white/10 bg-slate-800/80 py-2 text-center text-sm font-medium text-slate-100 transition-colors hover:bg-slate-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
                >
                  View details
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Course statistics">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="glass group relative isolate overflow-hidden rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-950/25 to-slate-900/70 p-5 shadow-[0_0_24px_rgba(251,191,36,0.05)] backdrop-blur-xl">
              <DashboardCardBackground image="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=800&auto=format&fit=crop" />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-300">Active Courses</p>
                  <p className="mt-3 text-4xl font-display font-bold leading-none text-white">
                    {activeCoursesCount}
                  </p>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-amber-300/30 bg-amber-400/10 text-amber-200">
                  <BookOpen className="size-5" aria-hidden="true" />
                </span>
              </div>
              <p className="relative z-10 mt-4 text-xs text-slate-400">
                {courses.length} total courses in system
              </p>
              <div className="relative z-10 mt-4">
                <Link
                  to="/courses"
                  className="block w-full rounded-md border border-white/10 bg-slate-800/80 py-2 text-center text-sm font-medium text-slate-100 transition-colors hover:bg-slate-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50"
                >
                  View details
                </Link>
              </div>
            </div>
            <div className="glass group relative isolate overflow-hidden rounded-2xl border border-amber-300/20 bg-gradient-to-br from-yellow-950/20 to-slate-900/70 p-5 shadow-[0_0_24px_rgba(251,191,36,0.05)] backdrop-blur-xl">
              <DashboardCardBackground image="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=800&auto=format&fit=crop" />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-300">Courses Completed</p>
                  <p className="mt-3 text-4xl font-display font-bold leading-none text-white">
                    {completedInPeriod}
                  </p>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-amber-300/30 bg-amber-400/10 text-amber-200">
                  <BookOpenCheck className="size-5" aria-hidden="true" />
                </span>
              </div>
              <p className="relative z-10 mt-4 text-xs text-slate-400">
                In the selected month or period
              </p>
              <div className="relative z-10 mt-4">
                <Link
                  to="/courses"
                  className="block w-full rounded-md border border-white/10 bg-slate-800/80 py-2 text-center text-sm font-medium text-slate-100 transition-colors hover:bg-slate-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50"
                >
                  View details
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-label="Financial overview"
          className="rounded-2xl border border-teal-300/15 bg-gradient-to-br from-teal-950/20 via-slate-900/55 to-slate-900/60 p-4 shadow-[0_0_28px_rgba(20,184,166,0.05)] backdrop-blur-xl"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Financial Overview</h2>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Monthly income, expenses, and balance
              </p>
            </div>
            {canViewFinance && (
              <Link
                to="/finance"
                className="text-xs font-medium text-emerald-200 hover:text-emerald-100"
              >
                Open finance
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="glass-inset rounded-xl border border-emerald-300/20 bg-emerald-400/[0.04] p-4">
              <p className="text-sm text-emerald-100/90">Monthly Income (฿)</p>
              <p className="mt-1 text-3xl font-display font-bold text-emerald-100">
                {formatShortThb(totalIncome)}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-mint" />
                <span className="text-[11px] text-muted-foreground">
                  Donations &amp; offerings, including events
                </span>
              </div>
            </div>
            <div className="glass-inset rounded-xl border border-rose-300/20 bg-rose-400/[0.04] p-4">
              <p className="text-sm text-rose-100/90">Monthly Expenses (฿)</p>
              <p className="mt-1 text-3xl font-display font-bold text-rose-100">
                {formatShortThb(totalExpense)}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-rose" />
                <span className="text-[11px] text-muted-foreground">
                  Supplies, utilities &amp; event expenses
                </span>
              </div>
            </div>
            <div className="glass-inset rounded-xl border border-teal-300/20 bg-teal-400/[0.04] p-4">
              <p className="text-sm text-teal-100/90">
                Net Balance (฿) <span className="opacity-60">· လက်ကျန်</span>
              </p>
              <p className="mt-1 text-3xl font-display font-bold text-teal-100">
                {netBalance >= 0 ? "+ " : "− "}
                {formatShortThb(Math.abs(netBalance))}
              </p>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Income − expense, including events
              </p>
            </div>
          </div>
          {areEventsLoading && (
            <p className="mt-2 text-[11px] text-muted-foreground" role="status">
              Loading event income and expenses…
            </p>
          )}
          {eventLoadError && (
            <p className="mt-2 text-[11px] text-rose" role="alert">
              Event income and expenses could not be included.
            </p>
          )}

        </section>

        {canManageRecords && <section aria-label="Quick actions">
          <div className="glass w-full rounded-2xl border border-violet-300/15 bg-gradient-to-br from-violet-950/25 to-slate-900/70 p-5 shadow-[0_0_24px_rgba(139,92,246,0.04)] backdrop-blur-xl">
            <p className="text-sm text-violet-100/90">Quick Actions</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Link
                to="/attendance"
                className="group flex min-h-12 items-center justify-center gap-2 rounded-xl border border-violet-300/15 bg-violet-300/[0.04] px-3 py-3 text-center text-xs font-medium text-violet-100 transition-all hover:border-violet-300/35 hover:bg-violet-300/[0.09] hover:shadow-[0_0_20px_rgba(139,92,246,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/50"
              >
                <ClipboardCheck
                  className="size-4 shrink-0 text-violet-200 transition-colors group-hover:text-violet-100"
                  aria-hidden="true"
                />
                <span>+ Attendance</span>
              </Link>
              {canViewFinance && (
                <Link
                  to="/finance"
                  className="group flex min-h-12 items-center justify-center gap-2 rounded-xl border border-violet-300/15 bg-violet-300/[0.04] px-3 py-3 text-center text-xs font-medium text-violet-100 transition-all hover:border-violet-300/35 hover:bg-violet-300/[0.09] hover:shadow-[0_0_20px_rgba(139,92,246,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/50"
                >
                  <Receipt
                    className="size-4 shrink-0 text-violet-200 transition-colors group-hover:text-violet-100"
                    aria-hidden="true"
                  />
                  <span>+ Finance</span>
                </Link>
              )}
              <Link
                to="/students"
                search={{ q: "" }}
                className="group flex min-h-12 items-center justify-center gap-2 rounded-xl border border-violet-300/15 bg-violet-300/[0.04] px-3 py-3 text-center text-xs font-medium text-violet-100 transition-all hover:border-violet-300/35 hover:bg-violet-300/[0.09] hover:shadow-[0_0_20px_rgba(139,92,246,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/50"
              >
                <UserPlus
                  className="size-4 shrink-0 text-violet-200 transition-colors group-hover:text-violet-100"
                  aria-hidden="true"
                />
                <span>+ Student</span>
              </Link>
              <Link
                to="/staff"
                className="group flex min-h-12 items-center justify-center gap-2 rounded-xl border border-violet-300/15 bg-violet-300/[0.04] px-3 py-3 text-center text-xs font-medium text-violet-100 transition-all hover:border-violet-300/35 hover:bg-violet-300/[0.09] hover:shadow-[0_0_20px_rgba(139,92,246,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/50"
              >
                <UserRoundPlus
                  className="size-4 shrink-0 text-violet-200 transition-colors group-hover:text-violet-100"
                  aria-hidden="true"
                />
                <span>+ Member</span>
              </Link>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">Record data in one tap</p>
          </div>
        </section>}

        {canManageSystem && (
          <section aria-label="Backup and restore">
            <Panel
              title="Backup &amp; Restore"
              mm="Download or restore a full system data backup"
              className="border border-slate-400/15 bg-gradient-to-br from-slate-800/70 to-slate-950/80 shadow-[0_0_24px_rgba(59,130,246,0.04)]"
            >
              <p className="max-w-3xl text-xs text-muted-foreground">
                Back up students, teachers, staff, courses, attendance, finance, and events to a
                timestamped JSON file. Restoring sends the selected backup to the server and
                replaces active system data.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={downloadFullBackup}
                  disabled={isBackupLoading || isLoading}
                  className="gap-2 border border-blue-300/20 bg-blue-500/15 text-blue-100 hover:bg-blue-500/25"
                >
                  <Download className="size-4" />
                  {isBackupLoading ? "Preparing Backup…" : "Download Full Backup"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => backupFileInput.current?.click()}
                  disabled={isRestoringBackup}
                  className="gap-2 border border-rose-300/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                >
                  <RotateCcw className="size-4" />
                  Upload &amp; Restore Data
                </Button>
                <input
                  ref={backupFileInput}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  aria-label="Select HOPA backup JSON file"
                  onChange={(event) => void selectBackupFile(event.target.files?.[0])}
                />
              </div>
            </Panel>
          </section>
        )}
      </div>

      <AlertDialog
        open={canManageSystem && !!pendingBackup}
        onOpenChange={(open) => {
          if (!open && !isRestoringBackup) setPendingBackup(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore system data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the active system data with the selected backup. This change affects
              students, teachers, staff, courses, attendance, finance, and events. Make sure you
              have a current backup before continuing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoringBackup}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRestoringBackup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void confirmRestoreBackup();
              }}
            >
              {isRestoringBackup ? "Restoring…" : "Restore Data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
