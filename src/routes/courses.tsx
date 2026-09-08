import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, Panel } from "@/components/AppShell";
import { actions, useChurch } from "@/lib/church-store";
import { formatDate } from "@/lib/church-data";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "Courses & Training — House Of Prayer Assembly Sunday School OS" },
      {
        name: "description",
        content:
          "Create Sunday School courses with instructor, date and time, then track which students completed each training and when.",
      },
      { property: "og:title", content: "Courses & Training — House Of Prayer Assembly Sunday School OS" },
      {
        property: "og:description",
        content: "Course schedule and per-student completion tracker, searchable by title or date.",
      },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const { courses, students, completions } = useChurch();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(courses[0]?.id ?? "");
  const [form, setForm] = useState({
    title: "",
    date: "2026-09-13",
    time: "10:30",
    instructor: "",
  });

  const rows = useMemo(
    () =>
      courses.filter(
        (c) =>
          c.title.toLowerCase().includes(q.toLowerCase()) ||
          c.date.includes(q) ||
          formatDate(c.date).toLowerCase().includes(q.toLowerCase()),
      ),
    [courses, q],
  );

  const course = courses.find((c) => c.id === selected) ?? rows[0] ?? courses[0];

  return (
    <AppShell search={q} onSearch={setQ}>
      <h1 className="font-display text-2xl font-semibold">Courses &amp; Training</h1>
      <p className="text-[11px] text-muted-foreground mb-4">သင်တန်းများ စီမံခန့်ခွဲမှု</p>

      <div className="grid grid-cols-12 gap-4">
        <Panel
          title="Course Schedule"
          mm={`${rows.length} courses`}
          className="col-span-7"
          right={
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="field px-3 py-2 text-xs"
              placeholder="Search by title or date…"
              aria-label="Search courses"
            />
          }
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground border-b border-white/10">
                <th className="text-left font-medium py-2">Course</th>
                <th className="text-left font-medium py-2">Date</th>
                <th className="text-left font-medium py-2">Time</th>
                <th className="text-left font-medium py-2">Instructor</th>
                <th className="text-right font-medium py-2">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`cursor-pointer transition-colors ${
                    c.id === course?.id ? "bg-primary/15" : "hover:bg-white/5"
                  }`}
                >
                  <td className="py-2.5">
                    <p>{c.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.titleMm || c.id} {c.active ? "· active" : "· archived"}
                    </p>
                  </td>
                  <td className="py-2.5 text-muted-foreground">{formatDate(c.date)}</td>
                  <td className="py-2.5 text-muted-foreground">{c.time}</td>
                  <td className="py-2.5 text-muted-foreground">{c.instructor}</td>
                  <td className="py-2.5 text-right text-mint">
                    {completions.filter((x) => x.courseId === c.id).length}/{students.length}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                    No courses match this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <form
            className="mt-4 grid grid-cols-5 gap-2 rounded-xl glass-inset p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.title.trim()) return;
              actions.addCourse(form);
              setForm({ title: "", date: "2026-09-13", time: "10:30", instructor: "" });
            }}
          >
            <input
              className="field px-3 py-2 text-xs col-span-2"
              placeholder="Course name"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              className="field px-3 py-2 text-xs"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <input
              className="field px-3 py-2 text-xs"
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
            <input
              className="field px-3 py-2 text-xs"
              placeholder="Instructor"
              value={form.instructor}
              onChange={(e) => setForm({ ...form, instructor: e.target.value })}
            />
            <button className="col-span-5 rounded-xl gradient-brand py-2 text-xs font-medium">
              + Create Course
            </button>
          </form>
        </Panel>

        <Panel
          title={course ? `Completion · ${course.title}` : "Completion"}
          mm={course ? `${formatDate(course.date)} · ${course.time} · ${course.instructor}` : ""}
          className="col-span-5"
        >
          <ul className="divide-y divide-white/5">
            {course &&
              students.map((s) => {
                const done = completions.find(
                  (c) => c.courseId === course.id && c.studentId === s.id,
                );
                return (
                  <li key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={!!done}
                      onChange={() => actions.toggleCompletion(course.id, s.id, course.date)}
                      className="size-4 accent-mint"
                      aria-label={`${s.name} completed ${course.title}`}
                    />
                    <span>{s.name}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {done ? `Completed ${formatDate(done.date)}` : "Not completed"}
                    </span>
                  </li>
                );
              })}
          </ul>
        </Panel>
      </div>
    </AppShell>
  );
}
