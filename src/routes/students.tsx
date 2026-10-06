import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarCheck2, GraduationCap, Pencil, Trash2, UsersRound } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { ExportDropdown } from "@/components/ExportDropdown";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { allSundays, actions, formatApiError, useChurch } from "@/lib/church-store";
import { formatDate, initials, localDateString } from "@/lib/church-data";
import { toast } from "sonner";
import { usePermission } from "@/lib/auth";

export const Route = createFileRoute("/students")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s["q"] === "string" ? (s["q"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Student Directory — House Of Prayer Assembly Sunday School OS" },
      {
        name: "description",
        content:
          "Search Sunday School students by name, filter by grade or age, and open a full profile with parent contact, address and training history.",
      },
      {
        property: "og:title",
        content: "Student Directory — House Of Prayer Assembly Sunday School OS",
      },
      {
        property: "og:description",
        content:
          "Every Sunday School student, their guardians, attendance rate and completed training.",
      },
    ],
  }),
  component: StudentsPage,
});

const emptyForm = () => ({
  name: "",
  nameMm: "",
  gender: "",
  age: 0,
  grade: "",
  parentName: "",
  parentPhone: "",
  address: "",
  enrolled: localDateString(),
});

function StudentsPage() {
  const canManage = usePermission("manage-students");
  const canDelete = usePermission("delete-records");
  const search = Route.useSearch();
  const initialQ = search["q"];
  const { students, attendance, courses, completions, isLoading } = useChurch();
  const [q, setQ] = useState(initialQ);
  const [grade, setGrade] = useState("all");
  const [ageBand, setAgeBand] = useState("all");
  const [selected, setSelected] = useState(students[0]?.id ?? "");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [editing, setEditing] = useState<(typeof students)[number] | null>(null);
  const [editForm, setEditForm] = useState(emptyForm());
  const [editError, setEditError] = useState("");

  function validateStudentForm(studentForm: ReturnType<typeof emptyForm>) {
    if (!studentForm.name.trim()) return "Full name is required.";
    return "";
  }

  async function handleDelete(studentId: string) {
    setDeleting(true);
    try {
      await actions.deleteStudent(studentId);
      if (selected === studentId) setSelected("");
      toast.success("Successfully deleted record!");
    } catch (error) {
      console.error("Unable to delete student", error);
      toast.error(formatApiError(error, "Unable to delete student"));
    } finally {
      setDeleting(false);
    }
  }

  function startEditing(student: (typeof students)[number]) {
    setEditing(student);
    setEditForm({
      name: student.name,
      nameMm: student.nameMm,
      gender: student.gender ?? "",
      age: student.age,
      grade: student.grade,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      address: student.address,
      enrolled: student.enrolled,
    });
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
  const today = new Date().toISOString().slice(0, 10);
  const studentSessions = student
    ? allSundays.filter((date) => date >= student.enrolled && date <= today)
    : [];
  const attendedSessions = student
    ? studentSessions.filter((date) => attendance.includes(`${student.id}|${date}`))
    : [];
  const currentYear = today.slice(0, 4);
  const currentYearSessions = studentSessions.filter((date) => date.startsWith(currentYear));
  const currentYearAttended = student
    ? currentYearSessions.filter((date) => attendance.includes(`${student.id}|${date}`)).length
    : 0;
  const currentYearRate =
    currentYearSessions.length === 0
      ? 0
      : Math.round((currentYearAttended / currentYearSessions.length) * 100);
  const studentCourseHistory = student
    ? courses
        .map((course) => {
          const completion = completions.find(
            (record) => record.studentId === student.id && record.courseId === course.id,
          );
          return { course, completion };
        })
        .filter(({ course, completion }) => course.active || completion)
    : [];

  return (
    <AppShell search={q} onSearch={setQ}>
      <h1 className="font-display text-2xl font-semibold">Student Management</h1>
      <p className="text-[11px] text-muted-foreground mb-4">ကျောင်းသားစာရင်း စီမံခန့်ခွဲမှု</p>

      <div className="grid grid-cols-12 gap-4">
        <Panel
          title="Student Directory"
          mm={`${rows.length} of ${students.length} students`}
          className="col-span-12 lg:col-span-8"
          right={
            <div className="flex items-center gap-2">
              <ExportDropdown
                title="Student Directory"
                filename="student-directory"
                headers={["Name", "Myanmar Name", "Age", "Grade", "Parent", "Phone", "Address", "Enrolled"]}
                rows={rows.map((studentRow) => [
                  studentRow.name,
                  studentRow.nameMm,
                  studentRow.age,
                  studentRow.grade,
                  studentRow.parentName,
                  studentRow.parentPhone,
                  studentRow.address,
                  studentRow.enrolled,
                ])}
              />
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setAdding((v) => !v);
                    setFormError("");
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-medium gradient-mint text-accent-foreground"
                >
                  {adding ? "Close" : "+ Add Student"}
                </button>
              )}
            </div>
          }
        >
          {adding && canManage && (
            <form
              className="mb-4 grid grid-cols-4 gap-2 rounded-xl glass-inset p-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const validationError = validateStudentForm(form);
                setFormError(validationError);
                if (validationError) return;
                try {
                  const id = await actions.addStudent({
                    ...form,
                    gender: form.gender === "Male" || form.gender === "Female" ? form.gender : "Unknown",
                    nameMm: form.nameMm || "",
                    grade: form.grade || "",
                    parentName: form.parentName || "",
                    parentPhone: form.parentPhone || "",
                    address: form.address || "",
                  });
                  if (id) setSelected(id);
                  setForm(emptyForm());
                  setAdding(false);
                  toast.success(`Successfully added ${form.name}!`);
                } catch (error) {
                  console.error("Unable to save student", error);
                  toast.error(formatApiError(error, "Unable to create student"));
                }
              }}
            >
              {formError && <p className="col-span-4 text-xs text-rose">{formError}</p>}
              <label className="col-span-2 text-xs font-medium" htmlFor="student-name">Student Name<input id="student-name" className="field mt-1 w-full px-3 py-2 text-xs" placeholder="e.g. Thazin Moe" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label className="text-xs font-medium" htmlFor="student-gender">
                Gender
                <select
                  id="student-gender"
                  className="field mt-1 w-full px-3 py-2 text-xs"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>
              <label className="text-xs font-medium" htmlFor="student-age">Age<input id="student-age" className="field mt-1 w-full px-3 py-2 text-xs" placeholder="Optional" type="number" min="0" step="1" value={form.age || ""} onChange={(e) => setForm({ ...form, age: Number(e.target.value) || 0 })} /></label>
              <label className="text-xs font-medium" htmlFor="student-grade">Grade / Class<input type="text" className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs" placeholder="Optional" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} /></label>
              <label className="text-xs font-medium" htmlFor="student-parent-name">Parent Name<input id="student-parent-name" className="field mt-1 w-full px-3 py-2 text-xs" placeholder="Optional" value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} /></label>
              <label className="text-xs font-medium" htmlFor="student-parent-phone">Parent Phone<input id="student-parent-phone" className="field mt-1 w-full px-3 py-2 text-xs" placeholder="Optional" value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} /></label>
              <label className="text-xs font-medium" htmlFor="student-address">Address<input id="student-address" className="field mt-1 w-full px-3 py-2 text-xs" placeholder="Optional" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ⌕
              </span>
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

          <div className="mt-3 overflow-x-auto rounded-xl">
            {isLoading ? (
              <div className="space-y-3 p-3">
                {[1, 2, 3, 4].map((row) => <Skeleton key={row} className="h-12 w-full" />)}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState icon={UsersRound} description="Add a student or adjust your search filters to see records here." />
            ) : (
            <table className="min-w-[46rem] w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground border-b border-white/10">
                  <th className="text-left font-medium py-2 pl-2">Name</th>
                  <th className="text-left font-medium py-2">Gender</th>
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
                      <td className="py-2.5 text-muted-foreground">{s.gender}</td>
                      <td className="py-2.5 text-muted-foreground">
                        {s.age} · G{s.grade}
                      </td>
                      <td className="py-2.5 text-muted-foreground">{s.parentPhone}</td>
                      <td className="py-2.5 text-muted-foreground">{s.address}</td>
                      <td className="py-2.5 text-mint text-[11px]">
                        {done}/{courses.length} complete
                      </td>
                      <td className="py-2.5 pr-2 text-right">
                        {canManage && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Edit ${s.name}`}
                            title={`Edit ${s.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              startEditing(s);
                            }}
                          >
                            <Pencil />
                            <span className="sr-only">Edit</span>
                          </Button>
                        )}
                        {canDelete && (
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
                        )}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                      No students match this search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            )}
          </div>
        </Panel>

        <div className="col-span-4 space-y-4">
          {student && (
            <>
              <Panel
                title="Student Profile"
                mm="ကျောင်းသား အချက်အလက်"
                right={
                  <div className="flex items-center gap-1">
                    {canManage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${student.name}`}
                        title={`Edit ${student.name}`}
                        onClick={() => startEditing(student)}
                      >
                        <Pencil />
                        <span className="sr-only">Edit</span>
                      </Button>
                    )}
                    {canDelete && (
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
                    )}
                  </div>
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
                </dl>
              </Panel>

              <Panel
                title="Attendance History"
                mm={`${attendedSessions.length} of ${studentSessions.length} sessions attended`}
              >
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <CalendarCheck2 className="size-5 shrink-0 text-mint" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium">{currentYear} attendance</span>
                      <span className="text-mint">{currentYearRate}%</span>
                    </div>
                    <div
                      className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
                      role="meter"
                      aria-label={`${currentYear} attendance rate`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={currentYearRate}
                    >
                      <div
                        className="h-full rounded-full gradient-mint transition-[width]"
                        style={{ width: `${currentYearRate}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {currentYearAttended} of {currentYearSessions.length} sessions
                    </p>
                  </div>
                </div>
                <div className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1">
                  {studentSessions.length === 0 ? (
                    <p className="py-3 text-center text-xs text-muted-foreground">
                      No Sunday sessions since enrollment.
                    </p>
                  ) : (
                    [...studentSessions].reverse().map((date) => {
                      const attended = attendance.includes(`${student.id}|${date}`);
                      return (
                        <div
                          key={date}
                          className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-xs hover:bg-white/[0.04]"
                        >
                          <span className="text-muted-foreground">{formatDate(date)}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              attended
                                ? "bg-mint/15 text-mint"
                                : "bg-rose/15 text-rose"
                            }`}
                          >
                            {attended ? "Attended" : "Absent"}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </Panel>

              <Panel
                title="Course Training Records"
                mm={`${studentCourseHistory.filter(({ completion }) => completion).length} completed · ${studentCourseHistory.filter(({ completion }) => !completion).length} in progress`}
              >
                <ul className="space-y-3">
                  {studentCourseHistory.map(({ course, completion }) => {
                    const progress = completion ? 100 : 0;
                    return (
                      <li
                        key={course.id}
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                      >
                        <div className="flex items-start gap-2">
                          <GraduationCap className="mt-0.5 size-4 shrink-0 text-accent" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-medium">{course.title}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  completion
                                    ? "bg-mint/15 text-mint"
                                    : "bg-accent/15 text-accent"
                                }`}
                              >
                                {completion ? "Completed" : "Enrolled"}
                              </span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                              <div
                                className={`h-full rounded-full transition-[width] ${
                                  completion ? "gradient-mint" : "bg-accent/70"
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="mt-1 flex justify-between gap-2 text-[10px] text-muted-foreground">
                              <span>{completion ? `Completed ${formatDate(completion.date)}` : `${formatDate(course.date)} · ${course.time}`}</span>
                              <span>{progress}%</span>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  {studentCourseHistory.length === 0 && (
                    <li className="py-3 text-center text-xs text-muted-foreground">
                      No active or completed course records.
                    </li>
                  )}
                </ul>
              </Panel>
            </>
          )}
        </div>
      </div>

      <Dialog open={canManage && !!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <form
            className="grid grid-cols-2 gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              const validationError = validateStudentForm(editForm);
              setEditError(validationError);
              if (!editing || validationError) return;
              try {
                await actions.updateStudent(editing.id, {
                  ...editForm,
                  gender:
                    editForm.gender === "Male" || editForm.gender === "Female"
                      ? editForm.gender
                      : "Unknown",
                  age: Number(editForm.age) || 0,
                  nameMm: editForm.nameMm || "",
                  grade: editForm.grade || "",
                  parentName: editForm.parentName || "",
                  parentPhone: editForm.parentPhone || "",
                  address: editForm.address || "",
                  enrolled: editForm.enrolled || localDateString(),
                });
                setEditing(null);
                setEditForm(emptyForm());
                toast.success(`Successfully updated ${editForm.name}!`);
              } catch (error) {
                toast.error(formatApiError(error, "Unable to update student"));
              }
            }}
          >
            {editError && <p className="col-span-2 text-xs text-rose">{editError}</p>}
            <label className="col-span-2 text-xs font-medium" htmlFor="edit-student-name">Student Name<input id="edit-student-name" className="field mt-1 w-full px-3 py-2 text-xs" placeholder="e.g. Thazin Moe" value={editForm.name} required onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></label>
            <label className="text-xs font-medium" htmlFor="edit-student-gender">Gender<select id="edit-student-gender" className="field mt-1 w-full px-3 py-2 text-xs" value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}><option value="">Unknown</option><option value="Male">Male</option><option value="Female">Female</option></select></label>
            <label className="text-xs font-medium" htmlFor="edit-student-name-mm">Myanmar Name<input id="edit-student-name-mm" className="field mt-1 w-full px-3 py-2 text-xs" placeholder="Optional Myanmar name" value={editForm.nameMm} onChange={(e) => setEditForm({ ...editForm, nameMm: e.target.value })} /></label>
            <label className="text-xs font-medium" htmlFor="edit-student-enrolled">Enrollment Date<input id="edit-student-enrolled" className="field mt-1 w-full px-3 py-2 text-xs" type="date" value={editForm.enrolled} onChange={(e) => setEditForm({ ...editForm, enrolled: e.target.value })} /></label>
            <label className="text-xs font-medium" htmlFor="edit-student-age">Age<input id="edit-student-age" className="field mt-1 w-full px-3 py-2 text-xs" type="number" placeholder="Optional" min="0" step="1" value={editForm.age || ""} onChange={(e) => setEditForm({ ...editForm, age: Number(e.target.value) || 0 })} /></label>
            <label className="text-xs font-medium" htmlFor="edit-student-grade">Grade / Class<input type="text" className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs" placeholder="Optional" value={editForm.grade} onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })} /></label>
            <label className="text-xs font-medium" htmlFor="edit-student-parent-name">Parent Name<input id="edit-student-parent-name" className="field mt-1 w-full px-3 py-2 text-xs" placeholder="Optional" value={editForm.parentName} onChange={(e) => setEditForm({ ...editForm, parentName: e.target.value })} /></label>
            <label className="text-xs font-medium" htmlFor="edit-student-parent-phone">Parent Phone<input id="edit-student-parent-phone" className="field mt-1 w-full px-3 py-2 text-xs" placeholder="Optional" value={editForm.parentPhone} onChange={(e) => setEditForm({ ...editForm, parentPhone: e.target.value })} /></label>
            <label className="col-span-2 text-xs font-medium" htmlFor="edit-student-address">Address<input id="edit-student-address" className="field mt-1 w-full px-3 py-2 text-xs" placeholder="Optional" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></label>
            <Button type="submit" className="col-span-2">
              Save changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
