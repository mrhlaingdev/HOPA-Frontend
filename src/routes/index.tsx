import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, Panel } from "@/components/AppShell";
import {
  CURRENT_MONTH,
  allSundays,
  attendanceRate,
  monthlyTotals,
  useChurch,
} from "@/lib/church-store";
import { formatDate, formatShort, initials } from "@/lib/church-data";

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
  const { students, courses, attendance, txns } = useChurch();
  const [q, setQ] = useState("");
  const month = monthlyTotals(txns, CURRENT_MONTH);
  const recentWeeks = allSundays.slice(-7);

  const filtered = useMemo(
    () => students.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())).slice(0, 3),
    [students, q],
  );

  const weeklyCounts = recentWeeks.map((d) => attendance.filter((k) => k.endsWith("|" + d)).length);
  const peak = Math.max(...weeklyCounts, 1);

  return (
    <AppShell search={q} onSearch={setQ}>
      <h1 className="sr-only">Church & Sunday School Dashboard</h1>

      <div className="grid grid-cols-12 gap-4">
        <div className="glass rounded-2xl col-span-8 p-5">
          <div className="flex items-baseline justify-between">
            <p className="text-muted-foreground text-sm">Total Sunday School Students</p>
            <span className="text-[11px] text-muted-foreground">Live data</span>
          </div>
          <p className="mt-2 text-4xl font-display font-bold">{students.length}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            တနင်္ဂနွေကျောင်း ကျောင်းသားစုစုပေါင်း
          </p>
          <div className="mt-4 flex h-10 items-end gap-1.5">
            {weeklyCounts.map((c, i) => (
              <div
                key={recentWeeks[i]}
                className="flex-1 rounded-t bg-accent"
                style={{ height: `${(c / peak) * 100}%`, opacity: 0.4 + i * 0.09 }}
                title={`${formatDate(recentWeeks[i]!)}: ${c} present`}
              />
            ))}
          </div>
        </div>

        <div className="col-span-4 grid grid-rows-2 gap-4">
          <div className="glass rounded-2xl p-5 flex flex-col">
            <p className="text-muted-foreground text-sm">Active Courses</p>
            <p className="mt-1 text-3xl font-display font-bold">
              {courses.filter((c) => c.active).length}
            </p>
            <p className="mt-auto text-[11px] text-muted-foreground">
              {courses.length} total this year
            </p>
          </div>
          <div className="glass rounded-2xl p-5 flex flex-col justify-center">
            <p className="text-muted-foreground text-sm">
              Net Balance <span className="opacity-60">· လက်ကျန်</span>
            </p>
            <p className="mt-1 text-2xl font-display font-bold text-mint">
              {month.net >= 0 ? "+ " : "− "}
              {formatShort(Math.abs(month.net))}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Income − Expense</p>
          </div>
        </div>

        <div className="glass rounded-2xl col-span-4 p-5">
          <p className="text-muted-foreground text-sm">Monthly Income</p>
          <p className="mt-1 text-3xl font-display font-bold">{formatShort(month.income)}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-mint" />
            <span className="text-[11px] text-muted-foreground">Donations &amp; offerings</span>
          </div>
        </div>

        <div className="glass rounded-2xl col-span-4 p-5">
          <p className="text-muted-foreground text-sm">Monthly Expenses</p>
          <p className="mt-1 text-3xl font-display font-bold">{formatShort(month.expense)}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-rose" />
            <span className="text-[11px] text-muted-foreground">Supplies &amp; utilities</span>
          </div>
        </div>

        <div className="glass rounded-2xl col-span-4 p-5">
          <p className="text-muted-foreground text-sm">Quick Actions</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Link
              to="/attendance"
              className="rounded-xl py-3 text-xs font-medium text-center gradient-violet"
            >
              + Attendance
            </Link>
            <Link
              to="/finance"
              className="rounded-xl py-3 text-xs font-medium text-center gradient-sky"
            >
              + Finance
            </Link>
            <Link
              to="/students"
              search={{ q: "" }}
              className="rounded-xl py-3 text-xs font-medium text-center gradient-mint text-accent-foreground"
            >
              + Student
            </Link>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">Record data in one tap</p>
        </div>

        <Panel
          title="Student Directory"
          className="col-span-5"
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
              <p className="py-6 text-center text-xs text-muted-foreground">No students found.</p>
            )}
          </div>
        </Panel>

        <Panel
          title="Weekly Attendance"
          className="col-span-7"
          right={
            <span className="text-[11px] text-muted-foreground">
              Last 7 Sundays · {formatDate(recentWeeks[0]!)} – {formatDate(recentWeeks[6]!)}
            </span>
          }
        >
          <div className="space-y-2">
            {students.slice(0, 4).map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <div className="w-28 truncate text-sm opacity-85">{s.name}</div>
                <div className="flex gap-1.5">
                  {recentWeeks.map((d) => {
                    const present = attendance.includes(`${s.id}|${d}`);
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
                  {attendanceRate(attendance, s.id)}% yearly
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Finance · Receipts"
          className="col-span-12"
          right={
            <div className="flex gap-2">
              <span className="rounded-full bg-mint/15 text-mint text-[11px] px-3 py-1">
                Income {formatShort(month.income)}
              </span>
              <span className="rounded-full bg-rose/15 text-rose text-[11px] px-3 py-1">
                Expense {formatShort(month.expense)}
              </span>
            </div>
          }
        >
          <div className="grid grid-cols-4 gap-3">
            {txns
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
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
