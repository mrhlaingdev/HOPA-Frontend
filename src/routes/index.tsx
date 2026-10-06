import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  attendanceRate,
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
import { formatDate, formatShort, initials } from "@/lib/church-data";
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
  const [q, setQ] = useState("");
  const [dateFilter, setDateFilter] = useState(ALL_DATE_FILTER);
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

  // Total Students အတွက် စနစ်ထဲရှိသမျှ ကျောင်းသားအကုန်လုံးကို ယူပါမည်
  const filteredStudents = students;

  // Active Courses အတွက် Archived မဖြစ်သေးသော သင်တန်းများကို ရေတွက်ပါမည်
  /* Line 59 ကို ဒီအတိုင်း လဲပေးပါ */
  const activeCoursesCount = courses.filter((c) => !(c as any)?.archived).length;

  const completedInPeriod = completions.filter(
    (completion) => completion?.date && matchesDate(completion.date, dateFilter),
  ).length;

  const filteredAttendance = attendance.filter(
    (record) => record?.includes("|") && matchesDate(record.split("|")[1] ?? "", dateFilter),
  );
  const month = monthlyTotals(txns || [], dateFilter) || {
    income: 0,
    expense: 0,
    net: 0,
    rows: [],
  };
  const recentWeeks = Array.from(
    new Set(attendance?.map((record) => record?.split("|")[1] ?? "") || []),
  )
    .filter((date) => matchesDate(date, dateFilter))
    .sort()
    .slice(-7);
  const lastWeek = recentWeeks[recentWeeks.length - 1];

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

  // Student Directory တွင် ပြသရန် စနစ်ထဲရှိ ကျောင်းသားများထဲမှ ရှာဖွေပါမည်
  const filtered = useMemo(
    () => students.filter((s) => s?.name?.toLowerCase?.().includes(q.toLowerCase())),
    [students, q],
  );

  return (
    <AppShell search={q} onSearch={setQ}>
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
        className="mb-4 border border-indigo-300/20 bg-slate-900/60 shadow-[0_0_28px_rgba(129,140,248,0.06)] backdrop-blur-xl"
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
            <div key={label} className="rounded-xl border border-indigo-300/10 bg-slate-950/30 p-3">
              <p className="text-[10px] font-medium uppercase text-indigo-200/80">{label}</p>
              <p className="mt-2 text-sm font-medium text-slate-100">{value}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="space-y-4">
        <section aria-label="People statistics">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="glass relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-900/60 p-5 shadow-[0_0_24px_rgba(34,211,238,0.07)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
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
              <div className="mt-4 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-cyan-300" />
                <p className="text-xs text-slate-300">
                  {displayedDashboardStats.maleStudents} Male{" "}
                  <span className="px-1 text-slate-500">•</span>
                  {displayedDashboardStats.femaleStudents} Female
                </p>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">All registered students</div>
            </div>
            <div className="glass relative overflow-hidden rounded-2xl border border-emerald-300/20 bg-slate-900/60 p-5 shadow-[0_0_24px_rgba(52,211,153,0.07)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
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
              <div className="mt-4 flex items-center gap-2">
                <p className="text-xs text-slate-300">
                  {displayedDashboardStats.maleTeachers} Male{" "}
                  <span className="px-1 text-slate-500">•</span>
                  {displayedDashboardStats.femaleTeachers} Female
                </p>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                  {activeTeachersCount} active
                </span>
                <span className="text-[11px] text-slate-400">
                  {teachers.length - activeTeachersCount} inactive
                </span>
              </div>
            </div>
            <div className="glass relative overflow-hidden rounded-2xl border border-indigo-300/20 bg-slate-900/60 p-5 shadow-[0_0_24px_rgba(129,140,248,0.07)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-300">Total Members</p>
                  <p className="mt-3 text-4xl font-display font-bold leading-none text-white">
                    {displayedDashboardStats.totalStaff}
                  </p>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-indigo-300/30 bg-indigo-400/10 text-indigo-200">
                  <UsersRound className="size-5" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <p className="text-xs text-slate-300">
                  {displayedDashboardStats.maleStaff} Male{" "}
                  <span className="px-1 text-slate-500">•</span>
                  {displayedDashboardStats.femaleStaff} Female
                </p>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-full border border-indigo-300/20 bg-indigo-300/10 px-2 py-0.5 text-[10px] font-medium text-indigo-200">
                  {activeMembersCount} active
                </span>
                <span className="text-[11px] text-slate-400">
                  {staff.length - activeMembersCount} inactive
                </span>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Course statistics">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="glass relative overflow-hidden rounded-2xl border border-amber-300/20 bg-slate-900/60 p-5 shadow-[0_0_24px_rgba(251,191,36,0.07)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
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
              <p className="mt-4 text-xs text-slate-400">
                {courses.length} total courses in system
              </p>
            </div>
            <div className="glass relative overflow-hidden rounded-2xl border border-indigo-300/20 bg-slate-900/60 p-5 shadow-[0_0_24px_rgba(129,140,248,0.07)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-300">Courses Completed</p>
                  <p className="mt-3 text-4xl font-display font-bold leading-none text-white">
                    {completedInPeriod}
                  </p>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-indigo-300/30 bg-indigo-400/10 text-indigo-200">
                  <BookOpenCheck className="size-5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 text-xs text-slate-400">
                In the selected month or period
              </p>
            </div>
          </div>
        </section>

        <section
          aria-label="Attendance and student directory"
          className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2"
        >
          <Panel
            title="Weekly Attendance"
            className="h-[380px] flex flex-col justify-between border border-white/10 bg-slate-900/60 backdrop-blur-xl"
            right={
              <span className="text-[11px] text-muted-foreground">
                {recentWeeks.length > 0
                  ? `Last 7 Sundays · ${formatDate(recentWeeks[0]!)} – ${formatDate(lastWeek!)}`
                  : "No attendance data for this period"}
              </span>
            }
          >
            <div className="h-[280px] max-h-[280px] overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
              <div className="space-y-2">
                {filteredStudents.map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="w-28 truncate text-sm opacity-85">{s.name}</div>
                    <div className="flex gap-1.5">
                      {recentWeeks.map((d) => {
                        const present = filteredAttendance.includes(`${s.id}|${d}`);
                        return (
                          <span
                            key={d}
                            title={formatDate(d)}
                            className={`size-6 rounded-md grid place-items-center text-[10px] ${
                              present ? "bg-mint/25 text-mint" : "bg-rose/20 text-rose"
                            }`}
                          >
                            {present ? "✓" : "✕"}
                          </span>
                        );
                      })}
                    </div>
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {attendanceRate(filteredAttendance, s.id)}% selected
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel
            title="Student Directory"
            className="h-[380px] flex flex-col justify-between border border-white/10 bg-slate-900/60 backdrop-blur-xl"
            right={
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="field px-3 py-1.5 text-xs"
                placeholder="Search name…"
                aria-label="Search students"
              />
            }
          >
            <div className="h-[280px] max-h-[280px] overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
              <div className="divide-y divide-white/5 text-sm">
                {filtered.map((s) => {
                  const rate = attendanceRate(attendance, s.id);
                  return (
                    <Link
                      key={s.id}
                      to="/students"
                      search={{ q: s.name }}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <div
                        className="size-8 rounded-full grid place-items-center text-[11px] font-semibold"
                        style={{ backgroundImage: s.gradient }}
                      >
                        {initials(s.name)}
                      </div>
                      <div className="leading-tight">
                        <p>{s.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Grade {s.grade} · Age {s.age}
                        </p>
                      </div>
                      <span
                        className={`ml-auto rounded-full text-[11px] px-2.5 py-1 ${
                          rate >= 85 ? "bg-mint/15 text-mint" : "bg-amber/15 text-amber"
                        }`}
                      >
                        {rate}% attended
                      </span>
                    </Link>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No students found.
                  </p>
                )}
              </div>
            </div>
          </Panel>
        </section>

        <section
          aria-label="Financial overview"
          className="rounded-2xl border border-emerald-300/15 bg-slate-900/40 p-4 shadow-[0_0_28px_rgba(52,211,153,0.05)] backdrop-blur-xl"
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
            <div className="glass-inset rounded-xl border border-white/5 p-4">
              <p className="text-muted-foreground text-sm">Monthly Income</p>
              <p className="mt-1 text-3xl font-display font-bold">
                {formatShort(month?.income || 0)}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-mint" />
                <span className="text-[11px] text-muted-foreground">Donations &amp; offerings</span>
              </div>
            </div>
            <div className="glass-inset rounded-xl border border-white/5 p-4">
              <p className="text-muted-foreground text-sm">Monthly Expenses</p>
              <p className="mt-1 text-3xl font-display font-bold">
                {formatShort(month?.expense || 0)}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-rose" />
                <span className="text-[11px] text-muted-foreground">Supplies &amp; utilities</span>
              </div>
            </div>
            <div className="glass-inset rounded-xl border border-emerald-300/15 p-4">
              <p className="text-muted-foreground text-sm">
                Net Balance <span className="opacity-60">· လက်ကျန်</span>
              </p>
              <p className="mt-1 text-3xl font-display font-bold text-mint">
                {(month?.net || 0) >= 0 ? "+ " : "− "}
                {formatShort(Math.abs(month?.net || 0))}
              </p>
              <p className="mt-3 text-[11px] text-muted-foreground">Income − Expense</p>
            </div>
          </div>

          <Panel
            title="Finance · Receipts"
            className="mt-4"
            right={
              <div className="flex gap-2">
                <span className="rounded-full bg-mint/15 text-mint text-[11px] px-3 py-1">
                  Income {formatShort(month?.income || 0)}
                </span>
                <span className="rounded-full bg-rose/15 text-rose text-[11px] px-3 py-1">
                  Expense {formatShort(month?.expense || 0)}
                </span>
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(month?.rows || [])
                .filter((t) => t.receipt)
                .slice(0, 4)
                .map((t) => (
                  <div key={t.id} className="rounded-xl glass-inset p-3">
                    <img
                      src={t.receipt}
                      alt={`Receipt for ${t.description}`}
                      loading="lazy"
                      width={512}
                      height={512}
                      className="w-full aspect-4/3 rounded-lg object-cover"
                    />
                    <p className="mt-2 text-xs">{t.category}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(t.date)} · {formatShort(t.amount)}
                    </p>
                  </div>
                ))}
              {(month?.rows || []).filter((t) => t.receipt).length === 0 && (
                <p className="col-span-2 py-6 text-center text-xs text-muted-foreground sm:col-span-4">
                  No receipts for the selected period.
                </p>
              )}
            </div>
          </Panel>
        </section>

        {canManageRecords && <section aria-label="Quick actions">
          <div className="glass w-full rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl">
            <p className="text-muted-foreground text-sm">Quick Actions</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Link
                to="/attendance"
                className="group flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.03] px-3 py-3 text-center text-xs font-medium text-cyan-100 transition-all hover:border-cyan-300/35 hover:bg-cyan-300/[0.08] hover:shadow-[0_0_20px_rgba(34,211,238,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
              >
                <ClipboardCheck
                  className="size-4 shrink-0 text-cyan-200 transition-colors group-hover:text-cyan-100"
                  aria-hidden="true"
                />
                <span>+ Attendance</span>
              </Link>
              {canViewFinance && (
                <Link
                  to="/finance"
                  className="group flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.03] px-3 py-3 text-center text-xs font-medium text-emerald-100 transition-all hover:border-emerald-300/35 hover:bg-emerald-300/[0.08] hover:shadow-[0_0_20px_rgba(52,211,153,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50"
                >
                  <Receipt
                    className="size-4 shrink-0 text-emerald-200 transition-colors group-hover:text-emerald-100"
                    aria-hidden="true"
                  />
                  <span>+ Finance</span>
                </Link>
              )}
              <Link
                to="/students"
                search={{ q: "" }}
                className="group flex min-h-12 items-center justify-center gap-2 rounded-xl border border-indigo-300/15 bg-indigo-300/[0.03] px-3 py-3 text-center text-xs font-medium text-indigo-100 transition-all hover:border-indigo-300/35 hover:bg-indigo-300/[0.08] hover:shadow-[0_0_20px_rgba(129,140,248,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/50"
              >
                <UserPlus
                  className="size-4 shrink-0 text-indigo-200 transition-colors group-hover:text-indigo-100"
                  aria-hidden="true"
                />
                <span>+ Student</span>
              </Link>
              <Link
                to="/staff"
                className="group flex min-h-12 items-center justify-center gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.03] px-3 py-3 text-center text-xs font-medium text-amber-100 transition-all hover:border-amber-300/35 hover:bg-amber-300/[0.08] hover:shadow-[0_0_20px_rgba(251,191,36,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50"
              >
                <UserRoundPlus
                  className="size-4 shrink-0 text-amber-200 transition-colors group-hover:text-amber-100"
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
              className="border border-amber-300/15"
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
                  className="gap-2"
                >
                  <Download className="size-4" />
                  {isBackupLoading ? "Preparing Backup…" : "Download Full Backup"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => backupFileInput.current?.click()}
                  disabled={isRestoringBackup}
                  className="gap-2"
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
