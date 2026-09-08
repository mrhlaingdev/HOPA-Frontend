import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
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

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "Weekly Attendance — House Of Prayer Assembly Sunday School OS" },
      {
        name: "description",
        content:
          "Tick off Sunday School attendance week by week and review each student's total attendance and yearly attendance rate.",
      },
      { property: "og:title", content: "Weekly Attendance — House Of Prayer Assembly Sunday School OS" },
      {
        property: "og:description",
        content: "Checkbox attendance for each Sunday plus a full attendance history per student.",
      },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const { students, attendance } = useChurch();
  const [week, setWeek] = useState(allSundays[allSundays.length - 1]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<(typeof students)[number] | null>(null);
  const [editForm, setEditForm] = useState({ date: week, present: false });
  const recent = allSundays.slice(-10);

  const rows = students.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
  const presentCount = rows.filter((s) => attendance.includes(`${s.id}|${week}`)).length;

  return (
    <AppShell search={q} onSearch={setQ}>
      <h1 className="font-display text-2xl font-semibold">Weekly Attendance Tracking</h1>
      <p className="text-[11px] text-muted-foreground mb-4">အပတ်စဉ် တက်ရောက်မှု မှတ်တမ်း</p>

      <div className="grid grid-cols-12 gap-4">
        <Panel
          title="Check-in Sheet"
          mm={`${presentCount} of ${rows.length} present · ${formatDate(week!)}`}
          className="col-span-6"
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
          <ul className="divide-y divide-white/5">
            {rows.map((s) => {
              const key = `${s.id}|${week}`;
              const present = attendance.includes(key);
              return (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={present}
                    onChange={() => actions.toggleAttendance(s.id, week!)}
                    className="size-4 accent-mint"
                    aria-label={`${s.name} present`}
                  />
                  <div
                    className="size-7 rounded-full grid place-items-center text-[10px] font-semibold"
                    style={{ backgroundImage: s.gradient }}
                  >
                    {initials(s.name)}
                  </div>
                  <span className="text-sm">{s.name}</span>
                  <span className="text-[11px] text-muted-foreground">Grade {s.grade}</span>
                  <span
                    className={`ml-auto text-[11px] ${present ? "text-mint" : "text-rose"}`}
                  >
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
                    <Pencil />
                    <span className="sr-only">Edit</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel
          title="Attendance History"
          mm="Last 10 Sundays · yearly rate"
          className="col-span-6"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
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
                    <td className="py-2 pr-2 whitespace-nowrap">{s.name}</td>
                    {recent.map((d) => {
                      const present = attendance.includes(`${s.id}|${d}`);
                      return (
                        <td key={d} className="py-2 px-1 text-center">
                          <span
                            className={`inline-grid size-5 place-items-center rounded ${
                              present ? "bg-mint/25 text-mint" : "bg-rose/20 text-rose"
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
                    <td className="py-2 text-right text-mint">
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
                        <Pencil />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              if (!editing) return;
              try {
                await actions.updateAttendance(editing.id, editForm);
                setEditing(null);
                setEditForm({ date: week!, present: false });
                toast.success(`Successfully updated ${editing.name}!`);
              } catch (error) {
                toast.error(formatApiError(error, "Unable to update attendance"));
              }
            }}
          >
            <input className="field w-full px-3 py-2 text-xs" type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editForm.present} onChange={(e) => setEditForm({ ...editForm, present: e.target.checked })} className="size-4 accent-mint" />
              Present
            </label>
            <Button type="submit" className="w-full">Save changes</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
