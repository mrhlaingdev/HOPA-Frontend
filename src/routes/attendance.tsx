import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, Pencil } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { ExportDropdown } from "@/components/ExportDropdown";
import { usePermission } from "@/lib/auth";
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
import {
  DEFAULT_ATTENDANCE_COURSES,
  formatDate,
  initials,
  localDateString,
} from "@/lib/church-data";
import { toast } from "sonner";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — House Of Prayer Assembly Sunday School OS" },
      {
        name: "description",
        content:
          "Track weekly Sunday School attendance and per-course attendance sessions, rosters, and student rates.",
      },
      {
        property: "og:title",
        content: "Attendance — House Of Prayer Assembly Sunday School OS",
      },
      {
        property: "og:description",
        content: "Record Sunday School and course attendance separately with session history.",
      },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const [isMounted, setIsMounted] = useState(false);
  const {
    students,
    attendance,
    courses,
    courseAttendance,
    courseAttendanceSessions,
    courseEnrollments,
    isLoading,
  } = useChurch();
  const canManage = usePermission("manage-students");
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const activeCourses = useMemo(() => {
    const availableCourses = courses.filter((course) => course.active);
    return availableCourses.length > 0 ? availableCourses : DEFAULT_ATTENDANCE_COURSES;
  }, [courses]);
  // ယနေ့ သို့မဟုတ် ယနေ့ထက် မကျော်သော အနီးစပ်ဆုံး တနင်္ဂနွေနေ့ရက်စွဲကို ရှာယူမည်
  const getInitialSunday = () => {
  const today = localDateString();
  const pastSundays = allSundays.filter((date) => date <= today);
  return pastSundays.length > 0 
    ? (pastSundays[pastSundays.length - 1] ?? "") 
    : (allSundays[0] ?? "");
};

  const [week, setWeek] = useState<string>(getInitialSunday());
  const [mode, setMode] = useState<"sunday" | "course">("sunday");
  const [selectedCourseId, setSelectedCourseId] = useState(
    activeCourses[0]?.id ?? DEFAULT_ATTENDANCE_COURSES[0]!.id,
  );
  const [courseSessionDate, setCourseSessionDate] = useState(localDateString());
  const [studentToEnroll, setStudentToEnroll] = useState("");
  const [manageEnrollments, setManageEnrollments] = useState(false);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<(typeof students)[number] | null>(null);
  const [editForm, setEditForm] = useState({ date: week, present: false });
  const currentIndex = week ? allSundays.indexOf(week) : -1;
  const todayStr = localDateString();
  const recent =
    currentIndex !== -1
      ? allSundays.slice(Math.max(0, currentIndex - 9), currentIndex + 1)
      : allSundays.filter((d) => d <= todayStr).slice(-10);

  const rows = students.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
  const presentCount = rows.filter((s) => attendance.includes(`${s.id}|${week}`)).length;
  const absentCount = rows.length - presentCount;
  const selectedCourse =
    activeCourses.find((course) => course.id === selectedCourseId) ?? activeCourses[0];

  useEffect(() => {
    if (selectedCourse && selectedCourse.id !== selectedCourseId) {
      setSelectedCourseId(selectedCourse.id);
    }
  }, [selectedCourse, selectedCourseId]);

  const enrolledIds = selectedCourse
    ? courseEnrollments
        .filter((enrollment) => enrollment.courseId === selectedCourse.id)
        .map((enrollment) => enrollment.studentId)
    : [];
  const isCourseEnrolled = (courseId: string, studentId: string) =>
    courseEnrollments.some(
      (enrollment) => enrollment.courseId === courseId && enrollment.studentId === studentId,
    );
  const courseRows = selectedCourse
    ? students.filter(
        (student) =>
          student.name.toLowerCase().includes(q.toLowerCase()) &&
          (enrolledIds.includes(student.id) ||
            courseAttendance.some(
              (record) =>
                record.courseId === selectedCourse.id && record.studentId === student.id,
            )),
      )
    : [];
  const courseSessions = selectedCourse
    ? courseAttendanceSessions
        .filter((session) => session.courseId === selectedCourse.id)
        .map((session) => session.date)
        .sort((a, b) => b.localeCompare(a))
        .slice(0, 10)
    : [];
  const courseHistoryDates = [
    courseSessionDate,
    ...courseSessions.filter((date) => date !== courseSessionDate),
  ].slice(0, 10);
  const sessionsForStudent = (courseId: string, studentId: string) => {
    const enrolledAt = courseEnrollments.find(
      (enrollment) => enrollment.courseId === courseId && enrollment.studentId === studentId,
    )?.enrolledAt;
    const firstRecordedDate = courseAttendance
      .filter((record) => record.courseId === courseId && record.studentId === studentId)
      .map((record) => record.date)
      .sort()[0];
    const firstEligibleDate = enrolledAt ?? firstRecordedDate;
    return courseAttendanceSessions
      .filter(
        (session) =>
          session.courseId === courseId &&
          (!firstEligibleDate || session.date >= firstEligibleDate),
      )
      .map((session) => session.date);
  };
  const hasCourseSession = selectedCourse
    ? courseAttendanceSessions.some(
        (session) =>
          session.courseId === selectedCourse.id && session.date === courseSessionDate,
      )
    : false;
  const coursePresentCount = selectedCourse
    ? courseRows.filter((student) =>
        courseAttendance.some(
          (record) =>
            record.courseId === selectedCourse.id &&
            record.studentId === student.id &&
            record.date === courseSessionDate &&
            record.present,
        ),
      ).length
    : 0;
  const unenrolledStudents = selectedCourse
    ? students.filter(
        (student) =>
          !enrolledIds.includes(student.id) &&
          !courseAttendance.some(
            (record) =>
              record.courseId === selectedCourse.id && record.studentId === student.id,
          ),
      )
    : [];

  const handleToggleAttendance = async (
    studentId: string,
    studentName: string,
    currentlyPresent: boolean,
  ) => {
    if (!canManage) return;
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

  if (!isMounted) {
    return (
      <main className="space-y-4 p-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </main>
    );
  }

  return (
    <AppShell search={q} onSearch={setQ}>
      <h1 className="font-display text-2xl font-semibold">Attendance Tracking</h1>
      <p className="mb-4 text-[11px] text-muted-foreground">တက်ရောက်မှု မှတ်တမ်း</p>

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Attendance type">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "sunday"}
          onClick={() => setMode("sunday")}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === "sunday"
              ? "border-primary/40 bg-primary/20 text-foreground"
              : "border-white/10 text-muted-foreground hover:bg-white/5"
          }`}
        >
          Sunday School Attendance
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "course"}
          onClick={() => setMode("course")}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === "course"
              ? "border-primary/40 bg-primary/20 text-foreground"
              : "border-white/10 text-muted-foreground hover:bg-white/5"
          }`}
        >
          Course Attendance
        </button>
      </div>

      {mode === "sunday" ? (
        <div className="grid grid-cols-12 gap-4">
        <Panel
          title="Check-in Sheet"
          mm={`${presentCount} of ${rows.length} present · ${formatDate(week!)}`}
          className="col-span-12 lg:col-span-6"
          right={
            <select
             value={week}
             onChange={(e) => setWeek(e.target.value)}
             className="field px-3 py-2 text-xs bg-slate-900 text-white border border-slate-700 rounded-md focus:outline-none"
             aria-label="Select Sunday"
>
            {[...allSundays].reverse().map((d) => (
            <option key={d} value={d} className="bg-slate-900 text-white">
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
                      disabled={!canManage}
                      onChange={() => void handleToggleAttendance(s.id, s.name, present)}
                      className="size-4 accent-mint enabled:cursor-pointer"
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
                    {canManage && <Button
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
                    </Button>}
                  </li>
                );
              })}
            </ul>
          )}
          {!isLoading && (
            <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-4">
              <div className="px-2 text-center">
                <p className="text-[10px] text-muted-foreground">Total Students</p>
                <p className="mt-1 text-lg font-semibold">{rows.length}</p>
              </div>
              <div className="px-2 text-center">
                <p className="text-[10px] text-muted-foreground">Present Students</p>
                <p className="mt-1 text-lg font-semibold text-mint">{presentCount}</p>
              </div>
              <div className="px-2 text-center">
                <p className="text-[10px] text-muted-foreground">Absent Students</p>
                <p className="mt-1 text-lg font-semibold text-rose">{absentCount}</p>
              </div>
            </div>
          )}
        </Panel>

        <Panel
          title="Attendance History"
          mm="Last 10 Sundays · yearly rate"
          className="col-span-12 lg:col-span-6"
          right={
            <ExportDropdown
              title="Attendance Report"
              filename="attendance-report"
              headers={[
                "Student",
                "Grade",
                ...recent.map((date) => formatDate(date)),
                "Total Attended",
                "Attendance Rate",
              ]}
              rows={rows.map((student) => [
                student.name,
                student.grade,
                ...recent.map((date) =>
                  attendance.includes(`${student.id}|${date}`) ? "Present" : "Absent",
                ),
                attendedCount(attendance, student.id),
                `${attendanceRate(attendance, student.id)}%`,
              ])}
            />
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
                        {canManage && <Button
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
                        </Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Panel>
      </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="min-w-52 text-xs font-medium">
              Course
              <select
                value={selectedCourse?.id ?? ""}
                onChange={(event) => setSelectedCourseId(event.target.value)}
                className="field mt-1 w-full px-3 py-2 text-xs"
                aria-label="Select course"
              >
                {activeCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              Session date
              <input
                type="date"
                value={courseSessionDate}
                onChange={(event) => setCourseSessionDate(event.target.value)}
                className="field mt-1 block px-3 py-2 text-xs"
                aria-label="Course attendance session date"
              />
            </label>
            {canManage && selectedCourse && (
              <Button
                type="button"
                disabled={!courseSessionDate || hasCourseSession}
                onClick={() => {
                  try {
                    actions.startCourseAttendanceSession(selectedCourse.id, courseSessionDate);
                    toast.success("Course attendance session is ready.");
                  } catch (error) {
                    toast.error(formatApiError(error, "Unable to start course session"));
                  }
                }}
              >
                {hasCourseSession ? "Session Ready" : "Start Session"}
              </Button>
            )}
            {canManage && selectedCourse && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setManageEnrollments((open) => !open)}
                >
                  + Manage Enrolled Students
                </Button>
                {manageEnrollments && (
                  <div className="w-full rounded-xl border border-white/10 p-3">
                    <p className="mb-2 text-xs font-medium">Enrolled students</p>
                    <p className="mb-3 text-xs text-muted-foreground">
                      {students
                        .filter((student) => isCourseEnrolled(selectedCourse.id, student.id))
                        .map((student) => student.name)
                        .join(", ") || "No students enrolled yet."}
                    </p>
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="text-xs font-medium">
                        Enroll student
                        <select
                          value={studentToEnroll}
                          onChange={(event) => setStudentToEnroll(event.target.value)}
                          className="field mt-1 block min-w-44 px-3 py-2 text-xs"
                          aria-label="Select student to enroll"
                        >
                          <option value="">Select student</option>
                          {unenrolledStudents.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!studentToEnroll}
                        onClick={() => {
                          try {
                            actions.enrollStudentInCourse(
                              selectedCourse.id,
                              studentToEnroll,
                              courseSessionDate,
                            );
                            setStudentToEnroll("");
                            toast.success("Student enrolled in the course.");
                          } catch (error) {
                            toast.error(formatApiError(error, "Unable to enroll student"));
                          }
                        }}
                      >
                        Enroll
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {!selectedCourse ? (
            <EmptyState
              icon={CalendarCheck2}
              description="Create or activate a course before recording course attendance."
            />
          ) : (
            <div className="grid grid-cols-12 gap-4">
              <Panel
                title={`Check-in Sheet · ${selectedCourse.title}`}
                mm={`${coursePresentCount} of ${courseRows.length} present · ${formatDate(courseSessionDate)}`}
                className="col-span-12 lg:col-span-6"
              >
                {isLoading && courseRows.length === 0 ? (
                  <div className="space-y-3 py-2">
                    {[1, 2, 3, 4].map((row) => (
                      <Skeleton key={row} className="h-10 w-full" />
                    ))}
                  </div>
                ) : courseRows.length === 0 ? (
                  <EmptyState
                    icon={CalendarCheck2}
                    description="Enroll students in this course to begin taking attendance."
                  />
                ) : (
                  <ul className="divide-y divide-white/5">
                    {courseRows.map((student) => {
                      const record = courseAttendance.find(
                        (entry) =>
                          entry.courseId === selectedCourse.id &&
                          entry.studentId === student.id &&
                          entry.date === courseSessionDate,
                      );
                      const present = record?.present ?? false;
                      return (
                        <li key={student.id} className="flex items-center gap-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={present}
                            disabled={!canManage}
                            onChange={(event) => {
                              try {
                                if (!hasCourseSession) {
                                  actions.startCourseAttendanceSession(
                                    selectedCourse.id,
                                    courseSessionDate,
                                  );
                                }
                                actions.updateCourseAttendance(
                                  selectedCourse.id,
                                  student.id,
                                  courseSessionDate,
                                  event.target.checked,
                                );
                                toast.success(
                                  `${student.name} marked ${event.target.checked ? "present" : "absent"}.`,
                                );
                              } catch (error) {
                                toast.error(formatApiError(error, "Unable to update attendance"));
                              }
                            }}
                            className="size-4 accent-mint enabled:cursor-pointer"
                            aria-label={`${student.name} attended ${selectedCourse.title}`}
                          />
                          <div
                            className="grid size-7 place-items-center rounded-full text-[10px] font-semibold"
                            style={{ backgroundImage: student.gradient }}
                          >
                            {initials(student.name)}
                          </div>
                          <span className="text-sm font-medium">{student.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            Grade {student.grade}
                          </span>
                          <span
                            className={`ml-auto text-[11px] font-medium ${
                              present ? "text-mint" : "text-rose"
                            }`}
                          >
                            {present ? "Present" : "Absent"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>

              <Panel
                title="Course Attendance History"
                mm={`Last ${courseSessions.length} sessions · ${courseRows.length} enrolled or attending students`}
                className="col-span-12 lg:col-span-6"
                right={
                  <ExportDropdown
                    title={`${selectedCourse.title} Attendance`}
                    filename="course-attendance"
                    headers={[
                      "Student",
                      ...courseHistoryDates.map((date) => formatDate(date)),
                      "Total Attended",
                      "Attendance Rate",
                    ]}
                    rows={courseRows.map((student) => {
                      const studentSessions = new Set(
                        sessionsForStudent(selectedCourse.id, student.id),
                      );
                      const attended = [...studentSessions].filter((date) =>
                        courseAttendance.some(
                          (record) =>
                            record.courseId === selectedCourse.id &&
                            record.studentId === student.id &&
                            record.date === date &&
                            record.present,
                        ),
                      ).length;
                      return [
                        student.name,
                        ...courseHistoryDates.map((date) => {
                          if (!studentSessions.has(date)) return "—";
                          return courseAttendance.some(
                            (record) =>
                              record.courseId === selectedCourse.id &&
                              record.studentId === student.id &&
                              record.date === date &&
                              record.present,
                          )
                            ? "Present"
                            : "Absent";
                        }),
                        attended,
                        `${studentSessions.size ? Math.round((attended / studentSessions.size) * 100) : 0}%`,
                      ];
                    })}
                  />
                }
              >
                <div className="overflow-x-auto">
                  {courseRows.length === 0 ? (
                    <EmptyState
                      icon={CalendarCheck2}
                      description="Course attendance history will appear after students are enrolled."
                    />
                  ) : (
                    <table className="min-w-[36rem] w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] text-muted-foreground">
                          <th className="py-2 pr-2 text-left font-medium">Student</th>
                          {courseHistoryDates.map((date) => (
                            <th key={date} className="px-1 py-2 font-medium">
                              {date.slice(8)}/{date.slice(5, 7)}
                            </th>
                          ))}
                          <th className="py-2 text-right font-medium">Total</th>
                          <th className="py-2 text-right font-medium">Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {courseRows.map((student) => {
                          const studentSessionDates = new Set(
                            sessionsForStudent(selectedCourse.id, student.id),
                          );
                          const totalPresent = courseAttendance.filter(
                            (record) =>
                              record.courseId === selectedCourse.id &&
                              record.studentId === student.id &&
                              record.present &&
                              studentSessionDates.has(record.date),
                          ).length;
                          const studentHistoryDates = courseHistoryDates.filter((date) =>
                            studentSessionDates.has(date),
                          );
                          return (
                            <tr key={student.id}>
                              <td className="whitespace-nowrap py-2 pr-2 font-medium">
                                {student.name}
                              </td>
                              {courseHistoryDates.map((date) => {
                                const eligibleForDate = studentHistoryDates.includes(date);
                                const present = courseAttendance.some(
                                  (record) =>
                                    record.courseId === selectedCourse.id &&
                                    record.studentId === student.id &&
                                    record.date === date &&
                                    record.present,
                                );
                                if (!eligibleForDate) {
                                  return (
                                    <td key={date} className="px-1 py-2 text-center text-white/25">
                                      —
                                    </td>
                                  );
                                }
                                return (
                                  <td key={date} className="px-1 py-2 text-center">
                                    <span
                                      className={`inline-grid size-5 place-items-center rounded ${
                                        present
                                          ? "bg-mint/25 text-mint"
                                          : "bg-rose/20 text-rose opacity-40"
                                      }`}
                                    >
                                      {present ? "✓" : "✕"}
                                    </span>
                                  </td>
                                );
                              })}
                              <td className="py-2 text-right text-muted-foreground">
                                {totalPresent}/{studentSessionDates.size}
                              </td>
                              <td className="py-2 text-right font-medium text-mint">
                                {studentSessionDates.size
                                  ? Math.round((totalPresent / studentSessionDates.size) * 100)
                                  : 0}
                                %
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </Panel>
            </div>
          )}
        </>
      )}

      <Dialog open={canManage && !!editing} onOpenChange={(open) => !open && setEditing(null)}>
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