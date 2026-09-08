import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { attendanceRate, attendedCount, allSundays, actions, useChurch } from "@/lib/church-store";
import { formatDate, initials } from "@/lib/church-data";

export const Route = createFileRoute("/students")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s["q"] === "string" ? (s["q"] as string) : "" }),
  head: () => ({
    meta: [
      { title: "Student Directory — House Of Prayer Assembly Sunday School OS" },
      {
        name: "description",
        content:
          "Search Sunday School students by name, filter by grade or age, and open a full profile with parent contact, address and training history.",
      },
      { property: "og:title", content: "Student Directory — House Of Prayer Assembly Sunday School OS" },
      {
        property: "og:description",
        content: "Every Sunday School student, their guardians, attendance rate and completed training.",
      },
    ],
  }),
  component: StudentsPage,
});

const emptyForm = {
  name: "",
  nameMm: "",
  age: 8,
  grade: 2,
  parentName: "",
  parentPhone: "",
  address: "",
  enrolled: "2026-09-06",
};

function StudentsPage() {
  const search = Route.useSearch();
  const initialQ = search["q"];
  const { students, attendance, courses, completions } = useChurch();
  const [q, setQ] = useState(initialQ);
  const [grade, setGrade] = useState("all");
  const [ageBand, setAgeBand] = useState("all");
  const [selected, setSelected] = useState(students[0]?.id ?? "");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function handleDelete(studentId: string) {
    setDeleting(true);
    try {
      await actions.deleteStudent(studentId);
      if (selected === studentId) setSelected("");
    } catch (error) {
      console.error("Unable to delete student", error);
    } finally {
      setDeleting(false);
    }
  }

  const rows = useMemo(
    () =>
      students.filter((s) => {
        const okName = s.name.toLowerCase().includes(q.toLowerCase());
        const okGrade = grade === "all" || String(s.grade) === grade;
        const okAge =
          ageBand === "all" ||
          (ageBand === "6-8" && s.age <= 8) ||
          (ageBand === "9-11" && s.age >= 9 && s.age <= 11) ||
          (ageBand === "12+" && s.age >= 12);
        return okName && okGrade && okAge;
      }),
    [students, q, grade, ageBand],
  );

  const student = students.find((s) => s.id === selected) ?? rows[0] ?? students[0];
  const trainings = completions
    .filter((c) => c.studentId === student?.id)
    .map((c) => ({ ...c, course: courses.find((x) => x.id === c.courseId) }))
    .filter((c) => c.course);

  return (
    <AppShell search={q} onSearch={setQ}>
      <h1 className="font-display text-2xl font-semibold">Student Management</h1>
      <p className="text-[11px] text-muted-foreground mb-4">ကျောင်းသားစာရင်း စီမံခန့်ခွဲမှု</p>

      <div className="grid grid-cols-12 gap-4">
        <Panel
          title="Student Directory"
          mm={`${rows.length} of ${students.length} students`}
          className="col-span-8"
          right={
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              className="rounded-xl px-4 py-2 text-xs font-medium gradient-mint text-accent-foreground"
            >
              {adding ? "Close" : "+ Add Student"}
            </button>
          }
        >
          {adding && (
            <form
              className="mb-4 grid grid-cols-4 gap-2 rounded-xl glass-inset p-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!form.name.trim()) return;
                try {
                  const id = await actions.addStudent(form);
                  if (id) setSelected(id);
                  setForm(emptyForm);
                  setAdding(false);
                } catch (error) {
                  console.error("Unable to save student", error);
                }
              }}
            >
              <input
                className="field px-3 py-2 text-xs col-span-2"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                className="field px-3 py-2 text-xs"
                placeholder="Age"
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
              />
              <input
                className="field px-3 py-2 text-xs"
                placeholder="Grade"
                type="number"
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })}
              />
              <input
                className="field px-3 py-2 text-xs"
                placeholder="Parent name"
                value={form.parentName}
                onChange={(e) => setForm({ ...form, parentName: e.target.value })}
              />
              <input
                className="field px-3 py-2 text-xs"
                placeholder="Parent phone"
                value={form.parentPhone}
                onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
              />
              <input
                className="field px-3 py-2 text-xs"
                placeholder="Address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
              <button className="rounded-xl gradient-brand text-xs font-medium py-2">Save</button>
            </form>
          )}

          <div className="flex items-center gap-2 text-[11px]">
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="field w-56 pl-8 pr-3 py-2 text-xs"
                placeholder="Search by student name"
                aria-label="Search by student name"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">⌕</span>
            </div>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="field px-2 py-2 text-xs text-muted-foreground"
              aria-label="Filter by grade"
            >
              <option value="all">Grade: All</option>
              {[1, 2, 3, 4, 5, 6, 7].map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
            <select
              value={ageBand}
              onChange={(e) => setAgeBand(e.target.value)}
              className="field px-2 py-2 text-xs text-muted-foreground"
              aria-label="Filter by age"
            >
              <option value="all">Age: Any</option>
              <option value="6-8">6–8</option>
              <option value="9-11">9–11</option>
              <option value="12+">12+</option>
            </select>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground border-b border-white/10">
                  <th className="text-left font-medium py-2 pl-2">Name</th>
                  <th className="text-left font-medium py-2">Age / Grade</th>
                  <th className="text-left font-medium py-2">Parent Phone</th>
                  <th className="text-left font-medium py-2">Address</th>
                  <th className="text-left font-medium py-2">Training</th>
                  <th className="py-2 pr-2" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((s) => {
                  const done = completions.filter((c) => c.studentId === s.id).length;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelected(s.id)}
                      className={`cursor-pointer transition-colors ${
                        s.id === student?.id ? "bg-primary/15" : "hover:bg-white/5"
                      }`}
                    >
                      <td className="py-2.5 pl-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="size-8 rounded-full grid place-items-center text-[11px] font-semibold"
                            style={{ backgroundImage: s.gradient }}
                          >
                            {initials(s.name)}
                          </div>
                          <div className="leading-tight">
                            <p>{s.name}</p>
                            <p className="text-[11px] text-muted-foreground">{s.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {s.age} · G{s.grade}
                      </td>
                      <td className="py-2.5 text-muted-foreground">{s.parentPhone}</td>
                      <td className="py-2.5 text-muted-foreground">{s.address}</td>
                      <td className="py-2.5 text-mint text-[11px]">
                        {done}/{courses.length} complete
                      </td>
                      <td className="py-2.5 pr-2 text-right">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={deleting}
                          aria-label={`Delete ${s.name}`}
                          title={`Delete ${s.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDelete(s.id);
                          }}
                        >
                          <Trash2 />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                      No students match this search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="col-span-4 space-y-4">
          {student && (
            <>
              <Panel
                title="Student Profile"
                mm="ကျောင်းသား အချက်အလက်"
                right={
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deleting}
                    aria-label={`Delete ${student.name}`}
                    title={`Delete ${student.name}`}
                    onClick={() => void handleDelete(student.id)}
                  >
                    <Trash2 />
                    <span className="sr-only">Delete</span>
                  </Button>
                }
              >
                <div className="flex items-center gap-3">
                  <div
                    className="size-14 rounded-2xl grid place-items-center font-display text-lg font-semibold"
                    style={{ backgroundImage: student.gradient }}
                  >
                    {initials(student.name)}
                  </div>
                  <div>
                    <p className="font-display text-lg leading-tight">{student.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {student.nameMm} · {student.id} · G{student.grade} · age {student.age}
                    </p>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-xs">
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Parent
                    </dt>
                    <dd className="mt-0.5">{student.parentName}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Phone
                    </dt>
                    <dd className="mt-0.5">{student.parentPhone}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Address
                    </dt>
                    <dd className="mt-0.5 text-muted-foreground">{student.address}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Enrolled
                    </dt>
                    <dd className="mt-0.5 text-muted-foreground">{formatDate(student.enrolled)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Sundays attended
                    </dt>
                    <dd className="mt-0.5 text-muted-foreground">
                      {attendedCount(attendance, student.id)}/{allSundays.length}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="uppercase tracking-[0.14em] text-muted-foreground">
                      Yearly attendance
                    </span>
                    <span className="text-mint">{attendanceRate(attendance, student.id)}%</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full gradient-mint"
                      style={{ width: `${attendanceRate(attendance, student.id)}%` }}
                    />
                  </div>
                </div>
              </Panel>

              <Panel title="Training Completion History" mm="သင်တန်း ပြီးမြောက်မှု မှတ်တမ်း">
                <ul className="space-y-2 text-xs">
                  {trainings.map((t) => (
                    <li key={t.courseId} className="flex justify-between gap-2">
                      <span>{t.course!.title}</span>
                      <span className="text-mint shrink-0">{formatDate(t.date)}</span>
                    </li>
                  ))}
                  {trainings.length === 0 && (
                    <li className="text-muted-foreground">No completed training yet.</li>
                  )}
                </ul>
              </Panel>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
