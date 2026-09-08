import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { DateFilters } from "@/components/DateFilters";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ALL_DATE_FILTER,
  actions,
  formatApiError,
  loadCourses,
  matchesDate,
  useChurch,
} from "@/lib/church-store";
import { formatDate } from "@/lib/church-data";
import { toast } from "sonner";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "Courses & Training — House Of Prayer Assembly Sunday School OS" },
      {
        name: "description",
        content:
          "Create Sunday School courses with instructor, date and time, then track which students completed each training and when.",
      },
      {
        property: "og:title",
        content: "Courses & Training — House Of Prayer Assembly Sunday School OS",
      },
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
  const [dateFilter, setDateFilter] = useState(ALL_DATE_FILTER);
  const [selected, setSelected] = useState(courses[0]?.id ?? "");
  const [form, setForm] = useState({
    title: "",
    date: "2026-09-13",
    time: "10:30",
    instructor: "",
  });
  const [editing, setEditing] = useState<(typeof courses)[number] | null>(null);
  const [editForm, setEditForm] = useState(form);

  useEffect(() => {
    void loadCourses().catch((error) => {
      toast.error(formatApiError(error, "Unable to load courses"));
    });
  }, []);

  const rows = useMemo(
    () =>
      courses.filter((c) => matchesDate(c.date, dateFilter)).filter(
        (c) =>
          c.title.toLowerCase().includes(q.toLowerCase()) ||
          c.date.includes(q) ||
          formatDate(c.date).toLowerCase().includes(q.toLowerCase()),
      ),
    [courses, q, dateFilter],
  );

  const course = rows.find((c) => c.id === selected) ?? rows[0];

  return (
    <AppShell search={q} onSearch={setQ}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Courses &amp; Training</h1>
          <p className="text-[11px] text-muted-foreground">သင်တန်းများ စီမံခန့်ခွဲမှု</p>
        </div>
        <DateFilters
          value={dateFilter}
          onChange={setDateFilter}
          dates={[...courses.map((course) => course.date), ...completions.map((item) => item.date)]}
        />
      </div>

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
                <th className="py-2" aria-label="Actions" />
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
                    {completions.filter(
                      (x) => x.courseId === c.id && matchesDate(x.date, dateFilter),
                    ).length}/{students.length}
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${c.title}`}
                        title={`Edit ${c.title}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditing(c);
                          setEditForm({
                            title: c.title,
                            date: c.date,
                            time: c.time,
                            instructor: c.instructor,
                          });
                        }}
                      >
                        <Pencil />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete ${c.title}`}
                        title={`Delete ${c.title}`}
                        onClick={async (event) => {
                          event.stopPropagation();
                          if (!window.confirm(`Delete ${c.title}?`)) return;
                          try {
                            await actions.deleteCourse(c.id);
                            if (selected === c.id) setSelected("");
                            toast.success("Successfully deleted record!");
                          } catch (error) {
                            toast.error(formatApiError(error, "Unable to delete course"));
                          }
                        }}
                      >
                        <Trash2 />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                    No courses match this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <form
            className="mt-4 grid grid-cols-5 gap-2 rounded-xl glass-inset p-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!form.title.trim()) return;
              try {
                await actions.addCourse(form);
                const courseName = form.title;
                setForm({ title: "", date: "2026-09-13", time: "10:30", instructor: "" });
                toast.success(`Successfully added ${courseName}!`);
              } catch (error) {
                toast.error(formatApiError(error, "Unable to create course"));
              }
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

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
          </DialogHeader>
          <form
            className="grid grid-cols-2 gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!editing || !editForm.title.trim()) return;
              try {
                await actions.updateCourse(editing.id, editForm);
                const courseName = editForm.title;
                setEditing(null);
                setEditForm({ title: "", date: "2026-09-13", time: "10:30", instructor: "" });
                toast.success(`Successfully updated ${courseName}!`);
              } catch (error) {
                toast.error(formatApiError(error, "Unable to update course"));
              }
            }}
          >
            <input
              className="field col-span-2 px-3 py-2 text-xs"
              placeholder="Course name"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            />
            <input
              className="field px-3 py-2 text-xs"
              type="date"
              value={editForm.date}
              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
            />
            <input
              className="field px-3 py-2 text-xs"
              type="time"
              value={editForm.time}
              onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
            />
            <input
              className="field col-span-2 px-3 py-2 text-xs"
              placeholder="Instructor"
              value={editForm.instructor}
              onChange={(e) => setEditForm({ ...editForm, instructor: e.target.value })}
            />
            <Button type="submit" className="col-span-2">
              Save changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
