import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, Download, Pencil, Trash2 } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { DateFilters } from "@/components/DateFilters";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ALL_DATE_FILTER,
  actions,
  formatApiError,
  matchesDate,
  useChurch,
} from "@/lib/church-store";
import { formatDate } from "@/lib/church-data";
import { toast } from "sonner";
import { usePermission } from "@/lib/auth";
import { downloadCsv } from "@/lib/utils";

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
  const canManage = usePermission("manage-courses");
  const canDelete = usePermission("delete-records");
  const { courses, students, teachers, completions, isLoading } = useChurch();
  const [q, setQ] = useState("");
  const [dateFilter, setDateFilter] = useState(ALL_DATE_FILTER);
  const [selected, setSelected] = useState(courses[0]?.id ?? "");
  const [form, setForm] = useState({
    title: "",
    date: "2026-09-13",
    time: "10:30",
    instructor: "",
    teacherId: "",
  });
  const [editing, setEditing] = useState<(typeof courses)[number] | null>(null);
  const [editForm, setEditForm] = useState(form);
  const [formError, setFormError] = useState("");
  const [editError, setEditError] = useState("");

  function validateCourse(courseForm: typeof form) {
    if (!courseForm.title.trim()) return "Course name is required.";
    if (!courseForm.date) return "Course date is required.";
    if (!courseForm.time) return "Course time is required.";
    if (!courseForm.instructor.trim()) return "Instructor is required.";
    return "";
  }

  function exportCourses() {
    downloadCsv(
      "courses-report.csv",
      ["Course", "Date", "Time", "Instructor", "Completed", "Students"],
      rows.map((courseRow) => [
        courseRow.title,
        courseRow.date,
        courseRow.time,
        courseRow.instructor,
        completions.filter(
          (completion) => completion.courseId === courseRow.id && matchesDate(completion.date, dateFilter),
        ).length,
        students.length,
      ]),
    );
  }

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
  const teacherName = (teacherId?: string, instructor?: string) => instructor || (teachers.find((teacher) => teacher.id === teacherId)?.name ?? "Unassigned");
  // Completion Toggle Handler
  const handleToggleCompletion = async (studentId: string, studentName: string) => {
    if (!course) return;
    try {
      await actions.toggleCompletion(studentId, course.id, course.date);
      toast.success(`Updated completion for ${studentName}`);
    } catch (error) {
      // Fallback: အကယ်၍ (courseId, studentId, date) Parameter structure ဖြစ်ခဲ့ရင်
      try {
        await actions.toggleCompletion(course.id, studentId, course.date);
        toast.success(`Updated completion for ${studentName}`);
      } catch (err) {
        toast.error(formatApiError(err, "Failed to update completion status"));
      }
    }
  };

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
          className="col-span-12 lg:col-span-7"
          right={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportCourses}
                className="glass rounded-xl px-3 py-2 text-xs font-medium flex items-center gap-1.5"
              >
                <Download className="size-3.5" /> Export CSV
              </button>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="field px-3 py-2 text-xs"
                placeholder="Search by title or date…"
                aria-label="Search courses"
              />
            </div>
          }
        >
          {isLoading ? (
            <div className="space-y-3 py-2">{[1, 2, 3, 4].map((row) => <Skeleton key={row} className="h-12 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <EmptyState icon={BookOpen} description="Create a course or adjust your filters to see the schedule." />
          ) : <div className="overflow-x-auto"><table className="min-w-[42rem] w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground border-b border-white/10">
                <th className="text-left font-medium py-2">Course</th>
                <th className="text-left font-medium py-2">Date</th>
                <th className="text-left font-medium py-2">Time</th>
                <th className="text-left font-medium py-2">Teacher</th>
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
                  <td className="py-2.5 text-muted-foreground">{teacherName(c.teacherId, c.instructor)}</td>
                  <td className="py-2.5 text-right text-mint">
                    {completions.filter(
                      (x) => x.courseId === c.id && matchesDate(x.date, dateFilter),
                    ).length}/{students.length}
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {canManage && <Button
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
                            teacherId: c.teacherId ?? "",
                          });
                        }}
                      >
                        <Pencil />
                        <span className="sr-only">Edit</span>
                      </Button>}
                      {canDelete && <Button
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
                      </Button>}
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
          </table></div>}

          {canManage && <form
            className="mt-4 grid grid-cols-5 gap-2 rounded-xl glass-inset p-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const validationError = validateCourse(form);
              setFormError(validationError);
              if (validationError) {
                toast.error(validationError);
                return;
              }
              try {
                await actions.addCourse(form);
                const courseName = form.title;
                setForm({ title: "", date: "2026-09-13", time: "10:30", instructor: "", teacherId: "" });
                toast.success(`Successfully added ${courseName}!`);
              } catch (error) {
                toast.error(formatApiError(error, "Unable to create course"));
              }
            }}
          >
            {formError && <p className="col-span-5 text-xs text-rose">{formError}</p>}
            <label className="col-span-2 text-xs font-medium" htmlFor="course-title">Course Name<input id="course-title" className="field mt-1 w-full px-3 py-2 text-xs" placeholder="e.g. New Believers Class" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label className="text-xs font-medium" htmlFor="course-date">Course Date<input id="course-date" className="field mt-1 w-full px-3 py-2 text-xs" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
            <label className="text-xs font-medium" htmlFor="course-time">Start Time<input id="course-time" className="field mt-1 w-full px-3 py-2 text-xs" type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></label>
            <label className="text-xs font-medium" htmlFor="course-instructor">Instructor<input id="course-instructor" className="field mt-1 w-full px-3 py-2 text-xs" placeholder="e.g. Pastor John" required value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} /></label>
            <label className="col-span-2 text-xs font-medium" htmlFor="course-teacher">Assigned Teacher<select id="course-teacher" className="field mt-1 w-full px-3 py-2 text-xs" value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}><option value="">Unassigned</option>{teachers.filter((teacher) => teacher.active !== false).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>
            <button className="col-span-5 rounded-xl gradient-brand py-2 text-xs font-medium">
              + Create Course
            </button>
          </form>}
        </Panel>

        <Panel
          title={course ? `Completion · ${course.title}` : "Completion"}
          mm={course ? `${formatDate(course.date)} · ${course.time} · ${course.instructor}` : ""}
          className="col-span-12 lg:col-span-5"
        >
          <ul className="divide-y divide-white/5">
            {course &&
              students.map((s) => {
                const done = completions.find(
                  (c) => c.courseId === course.id && c.studentId === s.id,
                );
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 py-2.5 text-sm cursor-pointer hover:bg-white/5 px-2 rounded-lg transition-colors"
                    onClick={() => handleToggleCompletion(s.id, s.name)}
                  >
                    <input
                      type="checkbox"
                      checked={!!done}
                      onChange={() => {}} // Controlled via parent li click
                      className="size-4 accent-mint cursor-pointer"
                      aria-label={`${s.name} completed ${course.title}`}
                    />
                    <span className="select-none font-medium">{s.name}</span>
                    <span
                      className={`ml-auto text-[11px] px-2 py-0.5 rounded-full ${
                        done
                          ? "bg-mint/15 text-mint font-medium"
                          : "text-muted-foreground opacity-60"
                      }`}
                    >
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
              const validationError = validateCourse(editForm);
              setEditError(validationError);
              if (!editing || validationError) {
                if (validationError) toast.error(validationError);
                return;
              }
              try {
                await actions.updateCourse(editing.id, editForm);
                const courseName = editForm.title;
                setEditing(null);
                setEditForm({ title: "", date: "2026-09-13", time: "10:30", instructor: "", teacherId: "" });
                toast.success(`Successfully updated ${courseName}!`);
              } catch (error) {
                toast.error(formatApiError(error, "Unable to update course"));
              }
            }}
          >
            {editError && <p className="col-span-2 text-xs text-rose">{editError}</p>}
            <label className="col-span-2 text-xs font-medium" htmlFor="edit-course-title">Course Name<input id="edit-course-title" className="field mt-1 w-full px-3 py-2 text-xs" placeholder="e.g. New Believers Class" required value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></label>
            <label className="text-xs font-medium" htmlFor="edit-course-date">Course Date<input id="edit-course-date" className="field mt-1 w-full px-3 py-2 text-xs" type="date" required value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} /></label>
            <label className="text-xs font-medium" htmlFor="edit-course-time">Start Time<input id="edit-course-time" className="field mt-1 w-full px-3 py-2 text-xs" type="time" required value={editForm.time} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} /></label>
            <label className="col-span-2 text-xs font-medium" htmlFor="edit-course-instructor">Instructor<input id="edit-course-instructor" className="field mt-1 w-full px-3 py-2 text-xs" placeholder="e.g. Pastor John" required value={editForm.instructor} onChange={(e) => setEditForm({ ...editForm, instructor: e.target.value })} /></label>
            <label className="col-span-2 text-xs font-medium" htmlFor="edit-course-teacher">Assigned Teacher<select id="edit-course-teacher" className="field mt-1 w-full px-3 py-2 text-xs" value={editForm.teacherId} onChange={(e) => setEditForm({ ...editForm, teacherId: e.target.value })}><option value="">Unassigned</option>{teachers.filter((teacher) => teacher.active !== false).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>
            <Button type="submit" className="col-span-2">
              Save changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}