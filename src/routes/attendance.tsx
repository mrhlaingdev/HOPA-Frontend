import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarCheck2, Download, Pencil } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  actions,
  allSundays,
  attendanceRate,
  attendedCount,
  formatApiError,
  useChurch,
} from "@/lib/church-store";
import { formatDate, initials } from "@/lib/church-data";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/utils";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "Weekly Attendance — House Of Prayer Assembly Sunday School OS" },
      {
        name: "description",
        content:
          "Tick off Sunday School attendance week by week and review each student's total attendance and yearly attendance rate.",
      },
      {
        property: "og:title",
        content: "Weekly Attendance — House Of Prayer Assembly Sunday School OS",
      },
      {
        property: "og:description",
        content: "Checkbox attendance for each Sunday plus a full attendance history per student.",
      },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const { students, attendance, isLoading } = useChurch();
  const [week, setWeek] = useState(allSundays[allSundays.length - 1]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<(typeof students)[number] | null>(null);
  const [editForm, setEditForm] = useState({ date: week, present: false });
  const recent = allSundays.slice(-10);

  const rows = students.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
  const presentCount = rows.filter((s) => attendance.includes(`${s.id}|${week}`)).length;

  const exportAttendance = () =>
    downloadCsv(
      "attendance-report.csv",
      [
        "Student",
        "Grade",
        ...recent.map((date) => formatDate(date)),
        "Total Attended",
        "Attendance Rate",
      ],
      rows.map((student) => [
        student.name,
        student.grade,
        ...recent.map((date) =>
          attendance.includes(`${student.id}|${date}`) ? "Present" : "Absent",
        ),
        attendedCount(attendance, student.id),
        `${attendanceRate(attendance, student.id)}%`,
      ]),
    );

  const handleToggleAttendance = async (
    studentId: string,
    studentName: string,
    currentlyPresent: boolean,
  ) => {
    try {
      await actions.updateAttendance(studentId, {
        date: week!,
        present: !currentlyPresent,
      });
      toast.success(`Updated attendance for ${studentName}`);
    } catch (error) {
      toast.error(formatApiError(error, "Failed to update attendance"));
    }
  };

  return (
    <AppShell search={q} onSearch={setQ}>
      <h1 className="font-display text-2xl font-semibold">Weekly Attendance Tracking</h1>
      <p className="text-[11px] text-muted-foreground mb-4">အပတ်စဉ် တက်ရောက်မှု မှတ်တမ်း</p>

      <div className="grid grid-cols-12 gap-4">
        <Panel
          title="Check-in Sheet"
          mm={`${presentCount} of ${rows.length} present · ${formatDate(week!)}`}
          className="col-span-12 lg:col-span-6"
          right={
            <select
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              className="field px-3 py-2 text-xs"
              aria-label="Select Sunday"
            >
              {[...allSundays].reverse().map((d) => (
                <option key={d} value={d}>
                  {formatDate(d)}
                </option>
              ))}
            </select>
          }
        >
          {isLoading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4].map((row) => (
                <Skeleton key={row} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState icon={CalendarCheck2} description="Attendance will appear here once students are available." />
          ) : (
            <ul className="divide-y divide-white/5">
              {rows.map((s) => {
                const key = `${s.id}|${week}`;
                const present = attendance.includes(key);
                return (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={present}
                      onChange={() => handleToggleAttendance(s.id, s.name, present)}
                      className="size-4 accent-mint cursor-pointer"
                      aria-label={`${s.name} present`}
                    />
                    <div
                      className="size-7 rounded-full grid place-items-center text-[10px] font-semibold"
                      style={{ backgroundImage: s.gradient }}
                    >
                      {initials(s.name)}
                    </div>
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-[11px] text-muted-foreground">Grade {s.grade}</span>
                    <span className={`ml-auto text-[11px] font-medium ${present ? "text-mint" : "text-rose"}`}>
                      {present ? "Present" : "Absent"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit attendance for ${s.name}`}
                      title={`Edit attendance for ${s.name}`}
                      onClick={() => {
                        setEditing(s);
                        setEditForm({ date: week!, present });
                      }}
                    >
                      <Pencil className="size-3.5" />
                      <span className="sr-only">Edit</span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Attendance History"
          mm="Last 10 Sundays · yearly rate"
          className="col-span-12 lg:col-span-6"
          right={
            <button
              type="button"
              onClick={exportAttendance}
              className="glass rounded-xl px-3 py-2 text-xs font-medium flex items-center gap-1.5"
            >
              <Download className="size-3.5" /> Export CSV
            </button>
          }
        >
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3, 4].map((row) => (
                  <Skeleton key={row} className="h-9 w-full" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState icon={CalendarCheck2} description="No attendance data is available for this view yet." />
            ) : (
              <table className="min-w-[44rem] w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-muted-foreground border-b border-white/10">
                    <th className="text-left font-medium py-2">Student</th>
                    {recent.map((d) => (
                      <th key={d} className="font-medium py-2 px-1">
                        {d.slice(8)}/{d.slice(5, 7)}
                      </th>
                    ))}
                    <th className="text-right font-medium py-2">Total</th>
                    <th className="text-right font-medium py-2">Rate</th>
                    <th className="py-2" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2 pr-2 whitespace-nowrap font-medium">{s.name}</td>
                      {recent.map((d) => {
                        const present = attendance.includes(`${s.id}|${d}`);
                        return (
                          <td key={d} className="py-2 px-1 text-center">
                            <span
                              className={`inline-grid size-5 place-items-center rounded ${
                                present ? "bg-mint/25 text-mint" : "bg-rose/20 text-rose opacity-40"
                              }`}
                            >
                              {present ? "✓" : "✕"}
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-2 text-right text-muted-foreground">
                        {attendedCount(attendance, s.id)}
                      </td>
                      <td className="py-2 text-right text-mint font-medium">
                        {attendanceRate(attendance, s.id)}%
                      </td>
                      <td className="py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Edit attendance for ${s.name}`}
                          title={`Edit attendance for ${s.name}`}
                          onClick={() => {
                            setEditing(s);
                            setEditForm({
                              date: week!,
                              present: attendance.includes(`${s.id}|${week}`),
                            });
                          }}
                        >
                          <Pencil className="size-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Panel>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendance{editing ? ` · ${editing.name}` : ""}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!editing || !editForm.date) {
                toast.error("Attendance date is required.");
                return;
              }
              try {
                await actions.updateAttendance(editing.id, {
                  date: editForm.date,
                  present: editForm.present,
                });
                setEditing(null);
                toast.success(`Successfully updated ${editing.name}!`);
              } catch (error) {
                toast.error(formatApiError(error, "Unable to update attendance"));
              }
            }}
          >
            <label className="block text-xs font-medium" htmlFor="attendance-date">
              Attendance Date
              <input
                id="attendance-date"
                className="field mt-1 w-full px-3 py-2 text-xs"
                type="date"
                required
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.present}
                onChange={(e) => setEditForm({ ...editForm, present: e.target.checked })}
                className="size-4 accent-mint cursor-pointer"
              />
              Present
            </label>
            <Button type="submit" className="w-full">
              Save changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}