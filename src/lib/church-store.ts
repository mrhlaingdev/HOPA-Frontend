import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  type Completion,
  type ChurchEvent,
  type Course,
  type Staff,
  type Student,
  type Teacher,
  type Txn,
  localDateString,
  parseNumericValue,
} from "./church-data";
import { getCurrentRole } from "./auth";

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly operation: string,
    public readonly detail: string,
  ) {
    super(detail);
    this.name = "ApiRequestError";
  }
}

function loadPersistedCourseEnrollments(): CourseEnrollment[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(COURSE_ENROLLMENTS_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("Course enrollments must be an array");
    return parsed.filter(
      (enrollment): enrollment is CourseEnrollment =>
        isRecord(enrollment) &&
        typeof enrollment["courseId"] === "string" &&
        typeof enrollment["studentId"] === "string" &&
        typeof enrollment["enrolledAt"] === "string",
    );
  } catch (error) {
    console.error("Unable to load saved course enrollments", error);
    toast.error("Saved course enrollment data is invalid and could not be loaded.");
    return [];
  }
}

export function formatApiError(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    return `Error (${error.status}): ${error.operation} - ${error.detail}`;
  }
  return `Error: ${error instanceof Error ? error.message : fallback}`;
}

export type ChurchState = {
  students: Student[];
  attendance: string[]; // `${studentId}|${sunday}`
  courseAttendance: CourseAttendance[];
  courseAttendanceSessions: CourseAttendanceSession[];
  courseEnrollments: CourseEnrollment[];
  courses: Course[];
  teachers: Teacher[];
  staff: Staff[];
  completions: Completion[];
  txns: Txn[];
  events: ChurchEvent[];
  isLoading: boolean;
};

export type CourseAttendance = {
  courseId: string;
  studentId: string;
  date: string;
  present: boolean;
};

export type CourseAttendanceSession = {
  courseId: string;
  date: string;
};

export type CourseEnrollment = {
  courseId: string;
  studentId: string;
  enrolledAt: string;
};

export type SystemBackup = {
  format: "hopa-full-backup";
  version: 1;
  createdAt: string;
  data: {
    students: Student[];
    teachers: Teacher[];
    staff: Staff[];
    courses: Course[];
    attendance: string[];
    completions: Completion[];
    finance: Txn[];
    events: ChurchEvent[];
  };
};

export type DashboardStats = {
  totalStudents: number;
  totalTeachers: number;
  totalStaff: number;
  maleStudents: number;
  femaleStudents: number;
  maleTeachers: number;
  femaleTeachers: number;
  maleStaff: number;
  femaleStaff: number;
};

export type ActivityLog = {
  id?: string | number;
  userId?: string | number;
  user_id?: string | number;
  userRole?: string;
  user_role?: string;
  action?: string;
  resource?: string;
  details?: unknown;
  timestamp?: string;
  createdAt?: string;
  created_at?: string;
};

const COMPLETIONS_STORAGE_KEY = "hopa-course-completions";
const COURSE_ATTENDANCE_STORAGE_KEY = "hopa-course-attendance";
const COURSE_ATTENDANCE_SESSIONS_STORAGE_KEY = "hopa-course-attendance-sessions";
const COURSE_ENROLLMENTS_STORAGE_KEY = "hopa-course-enrollments";

let state: ChurchState = {
  students: [],
  attendance: loadPersistedStringArray("hopa-sunday-attendance"),
  courseAttendance: loadPersistedCourseAttendance(),
  courseAttendanceSessions: loadPersistedCourseAttendanceSessions(),
  courseEnrollments: loadPersistedCourseEnrollments(),
  courses: [],
  teachers: [],
  staff: [],
  completions: loadPersistedCompletions(),
  txns: [],
  events: [],
  isLoading: true,
};
let loadPromise: Promise<void> | undefined;

const listeners = new Set<() => void>();
const API_TIMEOUT_MS = 10_000;

function set(next: Partial<ChurchState>) {
  state = { ...state, ...next };
  if (Object.hasOwn(next, "attendance")) {
    persistStringArray("hopa-sunday-attendance", state.attendance);
  }
  if (Object.hasOwn(next, "courseAttendance")) {
    persistJson(COURSE_ATTENDANCE_STORAGE_KEY, state.courseAttendance);
  }
  if (Object.hasOwn(next, "courseAttendanceSessions")) {
    persistJson(COURSE_ATTENDANCE_SESSIONS_STORAGE_KEY, state.courseAttendanceSessions);
  }
  if (Object.hasOwn(next, "courseEnrollments")) {
    persistJson(COURSE_ENROLLMENTS_STORAGE_KEY, state.courseEnrollments);
  }
  if (Object.hasOwn(next, "completions")) {
    persistCompletions(state.completions);
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot() {
  return state;
}

function loadPersistedStringArray(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
      throw new Error(`Stored ${key} data must be an array of strings`);
    }
    return parsed;
  } catch (error) {
    console.error(`Unable to load saved data for ${key}`, error);
    toast.error("Saved attendance data is invalid and could not be loaded.");
    return [];
  }
}

function loadPersistedCourseAttendance(): CourseAttendance[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(COURSE_ATTENDANCE_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("Course attendance must be an array");
    return parsed.filter(
      (record): record is CourseAttendance =>
        isRecord(record) &&
        typeof record["courseId"] === "string" &&
        typeof record["studentId"] === "string" &&
        typeof record["date"] === "string" &&
        typeof record["present"] === "boolean",
    );
  } catch (error) {
    console.error("Unable to load saved course attendance", error);
    toast.error("Saved course attendance is invalid and could not be loaded.");
    return [];
  }
}

function loadPersistedCourseAttendanceSessions(): CourseAttendanceSession[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(COURSE_ATTENDANCE_SESSIONS_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("Course attendance sessions must be an array");
    return parsed.filter(
      (session): session is CourseAttendanceSession =>
        isRecord(session) &&
        typeof session["courseId"] === "string" &&
        typeof session["date"] === "string",
    );
  } catch (error) {
    console.error("Unable to load saved course attendance sessions", error);
    toast.error("Saved course attendance sessions are invalid and could not be loaded.");
    return [];
  }
}

function persistStringArray(key: string, values: string[]) {
  persistJson(key, values);
}

function persistJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Unable to save data for ${key}`, error);
    toast.error("Attendance changed but could not be saved on this device.");
  }
}

export function useChurch() {
  useEffect(() => {
    if (!loadPromise) loadPromise = loadFromApi();
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const API_BASE_URL = ((import.meta as any).env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");

const API_ENDPOINTS = {
  health: "/api/test",
  students: "/api/students",
  courses: "/api/courses",
  teachers: "/api/teachers",
  staff: "/api/staff",
  attendance: "/api/attendance",
  transactions: "/api/finance",
  events: "/api/events",
  backupRestore: "/api/backup/restore",
  dashboardStats: "/api/dashboard/stats",
} as const;

async function fetchApi(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const headers = new Headers(init?.headers);
  const configuredToken = (import.meta as any).env.VITE_API_TOKEN as string | undefined;
  const storedToken =
    typeof window !== "undefined"
      ? window.localStorage.getItem("hopa-auth-token") ??
        window.localStorage.getItem("access-token")
      : null;
  const token = configuredToken || storedToken;

  headers.set("X-User-Role", getCurrentRole());
  headers.set("X-Role", getCurrentRole());

  try {
    if (!headers.has("Authorization")) {
      if (!token) {
        throw new Error(
          "Authentication token is required. Configure VITE_API_TOKEN or sign in again.",
        );
      }
      headers.set("Authorization", token.startsWith("Bearer ") ? token : `Bearer ${token}`);
    }

    return await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The backend request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function checkBackend() {
  if (!API_BASE_URL) return false;
  try {
    const response = await fetchApi(API_ENDPOINTS.health);
    if (!response.ok) await throwApiError(response, "Failed to connect to backend");
    return response.ok;
  } catch (error) {
    toast.error(formatApiError(error, "Unable to connect to backend"));
    return false;
  }
}

async function throwApiError(response: Response, operation: string): Promise<never> {
  let detail = response.statusText || "Request failed";
  try {
    const data = (await response.json()) as { error?: string; message?: string };
    detail = data.error || data.message || detail;
  } catch {
    // Keep the HTTP status text when the backend does not return JSON.
  }
  throw new ApiRequestError(response.status, operation, detail);
}

export async function loadStudents() {
  if (!API_BASE_URL) return [];

  const response = await fetchApi(API_ENDPOINTS.students);
  if (!response.ok) await throwApiError(response, "Failed to load students");

  const data = (await response.json()) as Student[] | { students?: Student[] };
  const students = Array.isArray(data) ? data : (data.students ?? []);
  set({ students });
  return students;
}

async function loadResource<T>(endpoint: string, key: string): Promise<T[]> {
  if (!API_BASE_URL) return [];

  const response = await fetchApi(endpoint);
  if (!response.ok) await throwApiError(response, `Failed to load ${key}`);

  const data = (await response.json()) as T[] | Record<string, T[] | undefined>;
  return Array.isArray(data) ? data : (data[key] ?? []);
}

export async function loadCourses() {
  const courses = await loadResource<Course>(API_ENDPOINTS.courses, "courses");
  set({ courses });
  return courses;
}

function normalizeCompletion(value: unknown): Completion {
  if (!isRecord(value)) throw new Error("Invalid course completion record from backend");

  const courseId = value["courseId"] ?? value["course_id"];
  const studentId = value["studentId"] ?? value["student_id"];
  const date = value["date"] ?? value["completed_at"] ?? value["completion_date"];
  if (
    (typeof courseId !== "string" && typeof courseId !== "number") ||
    (typeof studentId !== "string" && typeof studentId !== "number") ||
    typeof date !== "string"
  ) {
    throw new Error("Course completion record is missing course, student, or date");
  }
  return { courseId: String(courseId), studentId: String(studentId), date };
}

function loadPersistedCompletions(): Completion[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(COMPLETIONS_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("Stored course completions must be an array");
    return parsed.map(normalizeCompletion);
  } catch (error) {
    console.error("Unable to load saved course completions", error);
    toast.error("Saved course completion data is invalid and could not be loaded.");
    return [];
  }
}

function persistCompletions(completions: Completion[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COMPLETIONS_STORAGE_KEY, JSON.stringify(completions));
  } catch (error) {
    console.error("Unable to save course completions", error);
    toast.error("Course completion changed but could not be saved on this device.");
  }
}

export async function loadTeachers() {
  const teachers = await loadResource<Teacher>(API_ENDPOINTS.teachers, "teachers");
  set({ teachers });
  return teachers;
}

export async function loadStaff() {
  const staff = await loadResource<Staff>(API_ENDPOINTS.staff, "staff");
  set({ staff });
  return staff;
}

export async function loadAttendance() {
  const records = await loadResource<{
    student_name: string;
    date: string;
    status?: string;
  }>(API_ENDPOINTS.attendance, "attendance");

  const currentStudents = state.students.length ? state.students : await loadStudents();

  const attendance = records.flatMap((record) => {
    const isPresent = (record.status ?? "").toLowerCase() === "present";
    if (!isPresent) return [];

    const student = currentStudents.find((s) => s.name === record.student_name);
    return student ? [`${student.id}|${record.date}`] : [];
  });

  set({ attendance });
  return attendance;
}

export async function loadTransactions() {
  const records = await loadResource<
    Omit<Txn, "description"> & { description?: string; title?: string }
  >(API_ENDPOINTS.transactions, "transactions");
  const txns = records.map((transaction) => {
    const description = transaction.description || transaction.title;
    if (typeof description !== "string") {
      throw new Error("Invalid transaction response: missing title or description");
    }
    const amount = parseNumericValue(transaction.amount);
    if (amount === null) {
      throw new Error("Invalid transaction response: amount must be numeric");
    }
    return { ...transaction, description, amount };
  });
  set({ txns });
  return txns;
}

export async function loadEvents(): Promise<ChurchEvent[]> {
  if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");

  const response = await fetchApi(API_ENDPOINTS.events);
  if (!response.ok) await throwApiError(response, "Failed to load events");

  const data: unknown = await response.json();
  const records = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data["events"])
      ? data["events"]
      : null;
  if (!records) throw new Error("Invalid events response from backend");

  const events = records.map(normalizeEvent);
  set({ events });
  return events;
}

export async function loadActivityLogs(): Promise<ActivityLog[]> {
  if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");

  const response = await fetchApi("/api/audit-logs");
  if (!response.ok) await throwApiError(response, "Failed to load activity notifications");

  const payload: unknown = await response.json();
  const records = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? (payload["logs"] ?? payload["data"])
      : null;
  if (!Array.isArray(records)) {
    throw new Error("Invalid activity logs response from backend");
  }
  return records.filter(isRecord) as ActivityLog[];
}

export function parseSystemBackup(value: unknown): SystemBackup {
  if (
    !isRecord(value) ||
    value["format"] !== "hopa-full-backup" ||
    value["version"] !== 1 ||
    typeof value["createdAt"] !== "string" ||
    !Number.isFinite(Date.parse(value["createdAt"])) ||
    !isRecord(value["data"])
  ) {
    throw new Error("This file is not a valid HOPA backup.");
  }

  const data = value["data"];
  const students = requireBackupArray(data["students"], "students", isBackupStudent);
  const teachers = requireBackupArray(data["teachers"], "teachers", isBackupTeacher);
  const staff = requireBackupArray(data["staff"], "staff", isBackupStaff);
  const courses = requireBackupArray(data["courses"], "courses", isBackupCourse);
  const attendance = requireBackupArray(
    data["attendance"],
    "attendance",
    (item): item is string => typeof item === "string" && item.includes("|"),
  );
  const completions = requireBackupArray(data["completions"], "completions", isBackupCompletion);
  const finance = requireBackupArray(data["finance"], "finance", isBackupTransaction);
  const events = requireBackupArray(data["events"], "events", isBackupEvent);

  return {
    format: "hopa-full-backup",
    version: 1,
    createdAt: value["createdAt"],
    data: { students, teachers, staff, courses, attendance, completions, finance, events },
  };
}

function requireBackupArray<T>(
  value: unknown,
  label: string,
  isItem: (item: unknown) => item is T,
): T[] {
  if (!Array.isArray(value) || !value.every(isItem)) {
    throw new Error(`The backup contains invalid ${label} data.`);
  }
  return value;
}

function isBackupStudent(value: unknown): value is Student {
  return (
    isRecord(value) &&
    typeof value["id"] === "string" &&
    typeof value["name"] === "string" &&
    typeof value["nameMm"] === "string" &&
    (value["gender"] === "Male" || value["gender"] === "Female") &&
    typeof value["age"] === "number" &&
    Number.isFinite(value["age"]) &&
    typeof value["grade"] === "string" &&
    typeof value["parentName"] === "string" &&
    typeof value["parentPhone"] === "string" &&
    typeof value["address"] === "string" &&
    typeof value["enrolled"] === "string" &&
    typeof value["gradient"] === "string"
  );
}

function isBackupTeacher(value: unknown): value is Teacher {
  return (
    isRecord(value) &&
    typeof value["id"] === "string" &&
    typeof value["name"] === "string" &&
    (value["gender"] === "Male" || value["gender"] === "Female") &&
    typeof value["phone"] === "string" &&
    typeof value["email"] === "string" &&
    typeof value["specialization"] === "string" &&
    (value["active"] === undefined || typeof value["active"] === "boolean")
  );
}

function isBackupStaff(value: unknown): value is Staff {
  return (
    isRecord(value) &&
    typeof value["id"] === "string" &&
    typeof value["name"] === "string" &&
    (value["gender"] === "Male" || value["gender"] === "Female") &&
    typeof value["position"] === "string" &&
    typeof value["phone"] === "string" &&
    typeof value["email"] === "string" &&
    typeof value["salary"] === "number" &&
    Number.isFinite(value["salary"]) &&
    (value["active"] === undefined || typeof value["active"] === "boolean")
  );
}

function isBackupCourse(value: unknown): value is Course {
  return (
    isRecord(value) &&
    typeof value["id"] === "string" &&
    typeof value["title"] === "string" &&
    typeof value["titleMm"] === "string" &&
    typeof value["date"] === "string" &&
    typeof value["time"] === "string" &&
    typeof value["instructor"] === "string" &&
    (value["teacherId"] === undefined || typeof value["teacherId"] === "string") &&
    typeof value["active"] === "boolean"
  );
}

function isBackupCompletion(value: unknown): value is Completion {
  return (
    isRecord(value) &&
    typeof value["courseId"] === "string" &&
    typeof value["studentId"] === "string" &&
    typeof value["date"] === "string"
  );
}

function isBackupTransaction(value: unknown): value is Txn {
  return (
    isRecord(value) &&
    typeof value["id"] === "string" &&
    typeof value["date"] === "string" &&
    (value["type"] === "income" || value["type"] === "expense") &&
    typeof value["category"] === "string" &&
    typeof value["description"] === "string" &&
    typeof value["amount"] === "number" &&
    Number.isFinite(value["amount"]) &&
    (value["receipt"] === undefined || typeof value["receipt"] === "string")
  );
}

function isBackupEvent(value: unknown): value is ChurchEvent {
  return (
    isRecord(value) &&
    typeof value["id"] === "string" &&
    typeof value["title"] === "string" &&
    typeof value["date"] === "string" &&
    typeof value["location"] === "string" &&
    typeof value["attendeesCount"] === "number" &&
    Number.isFinite(value["attendeesCount"]) &&
    typeof value["foodMenu"] === "string" &&
    (typeof value["totalExpense"] === "string" ||
      (typeof value["totalExpense"] === "number" && Number.isFinite(value["totalExpense"]))) &&
    (typeof value["donations"] === "string" ||
      (typeof value["donations"] === "number" && Number.isFinite(value["donations"])))
  );
}

export async function restoreSystemBackup(value: unknown) {
  const backup = parseSystemBackup(value);
  if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");

  const response = await fetchApi(API_ENDPOINTS.backupRestore, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(backup),
  });
  if (!response.ok) await throwApiError(response, "Failed to restore system backup");

  set({
    students: backup.data.students,
    teachers: backup.data.teachers,
    staff: backup.data.staff,
    courses: backup.data.courses,
    attendance: backup.data.attendance,
    completions: backup.data.completions,
    txns: backup.data.finance,
    events: backup.data.events,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeEvent(value: unknown): ChurchEvent {
  if (!isRecord(value)) throw new Error("Invalid event record from backend");

  const id = value["id"];
  const title = value["title"];
  const date = value["date"] ?? value["event_date"];
  const location = value["location"];
  const attendeesCount = value["attendeesCount"] ?? value["attendees_count"] ?? value["attendees"];
  const foodMenu = value["foodMenu"] ?? value["food_menu"] ?? value["catering"];
  const totalExpense = value["totalExpense"] ?? value["total_expense"] ?? value["expense"];
  const donations = value["donations"] ?? value["donations_collected"];

  if (
    (typeof id !== "string" && typeof id !== "number") ||
    typeof title !== "string" ||
    typeof date !== "string" ||
    typeof location !== "string"
  ) {
    throw new Error("Event record is missing required fields");
  }

  return {
    id: String(id),
    title,
    date: normalizeEventDate(date),
    location,
    attendeesCount: toEventNumber(attendeesCount, "attendees count"),
    foodMenu: typeof foodMenu === "string" ? foodMenu : "",
    totalExpense: toEventAmount(totalExpense, "total expense"),
    donations: toEventAmount(donations, "donations"),
  };
}

function normalizeEventDate(value: string) {
  const trimmed = value.trim();
  const datePrefix = /^(\d{4}-\d{2}-\d{2})(?:$|[T ])/.exec(trimmed)?.[1];
  if (datePrefix) {
    const parsed = new Date(`${datePrefix}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== datePrefix)
      throw new Error("Event date is invalid");
    return datePrefix;
  }

  const parsed = new Date(trimmed);
  if (!Number.isFinite(parsed.getTime())) throw new Error("Event date is invalid");
  return parsed.toISOString().slice(0, 10);
}

function toEventAmount(value: unknown, label: string): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new Error(`Event ${label} is invalid`);
}

function toEventNumber(value: unknown, label: string) {
  const number = value === null || value === undefined ? 0 : parseNumericValue(value);
  if (number === null || !Number.isFinite(number) || number < 0) {
    throw new Error(`Event ${label} is invalid`);
  }
  return number;
}

export async function loadDashboardStats(): Promise<DashboardStats> {
  if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");

  const response = await fetchApi(API_ENDPOINTS.dashboardStats);
  if (!response.ok) await throwApiError(response, "Failed to load dashboard stats");

  return (await response.json()) as DashboardStats;
}

async function loadFromApi() {
  try {
    if (await checkBackend()) {
      await loadStudents();
      await Promise.all([
        loadCourses(),
        loadTeachers(),
        loadStaff(),
        loadAttendance(),
        loadTransactions(),
      ]);
      return;
    }
    set({ students: [], attendance: [], courses: [], teachers: [], staff: [], txns: [] });
  } catch (error) {
    toast.error(formatApiError(error, "Unable to load church data"));
  } finally {
    set({ isLoading: false });
  }
}

export const actions = {
  async addStudent(s: Omit<Student, "id" | "gradient">) {
    if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");

    const response = await fetchApi(API_ENDPOINTS.students, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    if (!response.ok) await throwApiError(response, "Failed to create student");

    const created = response.status === 204 ? {} : ((await response.json()) as Partial<Student>);
    const students = await loadStudents();
    return created.id ?? students.find((student) => student.name === s.name)?.id ?? "";
  },
  async deleteStudent(studentId: string) {
    if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");

    const response = await fetchApi(`${API_ENDPOINTS.students}/${studentId}`, {
      method: "DELETE",
    });
    if (!response.ok) await throwApiError(response, "Failed to delete student");

    await loadStudents();
  },
  async updateStudent(studentId: string, student: Partial<Omit<Student, "id" | "gradient">>) {
    await updateResource(API_ENDPOINTS.students, studentId, student, "student");
    await loadStudents();
  },
  async addCourse(c: Omit<Course, "id" | "active" | "titleMm">) {
    if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");

    const response = await fetchApi(API_ENDPOINTS.courses, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(c),
    });
    if (!response.ok) await throwApiError(response, "Failed to create course");

    await loadCourses();
  },
  async deleteCourse(courseId: string) {
    if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");

    const response = await fetchApi(`${API_ENDPOINTS.courses}/${courseId}`, {
      method: "DELETE",
    });
    if (!response.ok) await throwApiError(response, "Failed to delete course");

    await loadCourses();
  },
  async updateCourse(courseId: string, course: Partial<Omit<Course, "id">>) {
    await updateResource(API_ENDPOINTS.courses, courseId, course, "course");
    await loadCourses();
  },
  async addTeacher(teacher: Omit<Teacher, "id">) {
    await createResource(API_ENDPOINTS.teachers, teacher, "teacher");
    await loadTeachers();
  },
  async updateTeacher(teacherId: string, teacher: Partial<Omit<Teacher, "id">>) {
    await updateResource(API_ENDPOINTS.teachers, teacherId, teacher, "teacher");
    await loadTeachers();
  },
  async deleteTeacher(teacherId: string) {
    await deleteResource(API_ENDPOINTS.teachers, teacherId, "teacher");
    await loadTeachers();
  },
  async addStaff(staff: Omit<Staff, "id">) {
    await createResource(API_ENDPOINTS.staff, staff, "staff member");
    await loadStaff();
  },
  async updateStaff(staffId: string, staff: Partial<Omit<Staff, "id">>) {
    await updateResource(API_ENDPOINTS.staff, staffId, staff, "staff member");
    await loadStaff();
  },
  async deleteStaff(staffId: string) {
    await deleteResource(API_ENDPOINTS.staff, staffId, "staff member");
    await loadStaff();
  },
  async updateAttendance(studentId: string, attendance: { date: string; present: boolean }) {
    if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");

    const student = state.students.find((s) => s.id === studentId);
    if (!student) throw new Error("Student not found");

    const response = await fetchApi(API_ENDPOINTS.attendance, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_name: student.name,
        date: attendance.date,
        status: attendance.present ? "present" : "absent",
      }),
    });
    if (!response.ok) await throwApiError(response, "Failed to update attendance");

    await loadAttendance();
  },
  enrollStudentInCourse(courseId: string, studentId: string) {
    const exists = state.courseEnrollments.some(
      (enrollment) => enrollment.courseId === courseId && enrollment.studentId === studentId,
    );
    if (exists) return;
    set({
      courseEnrollments: [
        ...state.courseEnrollments,
        { courseId, studentId, enrolledAt: localDateString() },
      ],
    });
  },
  startCourseAttendanceSession(courseId: string, date: string) {
    if (!date) throw new Error("Course attendance date is required");
    const exists = state.courseAttendanceSessions.some(
      (session) => session.courseId === courseId && session.date === date,
    );
    if (!exists) {
      set({
        courseAttendanceSessions: [...state.courseAttendanceSessions, { courseId, date }],
      });
    }
  },
  updateCourseAttendance(
    courseId: string,
    studentId: string,
    date: string,
    present: boolean,
  ) {
    const sessionExists = state.courseAttendanceSessions.some(
      (session) => session.courseId === courseId && session.date === date,
    );
    if (!sessionExists) throw new Error("Start the course attendance session first");
    set({
      courseAttendance: [
        ...state.courseAttendance.filter(
          (record) =>
            record.courseId !== courseId ||
            record.studentId !== studentId ||
            record.date !== date,
        ),
        { courseId, studentId, date, present },
      ],
    });
  },
  async toggleCompletion(courseId: string, studentId: string, date: string) {
    const wasCompleted = state.completions.some(
      (completion) => completion.courseId === courseId && completion.studentId === studentId,
    );
    const nextCompletion = { courseId, studentId, date };
    set({
      completions: wasCompleted
        ? state.completions.filter((completion) =>
            completion.courseId !== courseId || completion.studentId !== studentId,
          )
        : [...state.completions, nextCompletion],
    });
  },
  async addTxn(t: Omit<Txn, "id">) {
    if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");

    const response = await fetchApi(API_ENDPOINTS.transactions, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toTransactionApiPayload(t)),
    });
    if (!response.ok) await throwApiError(response, "Failed to create transaction");

    await loadTransactions();
  },
  async addEvent(event: Omit<ChurchEvent, "id">): Promise<ChurchEvent[]> {
    await createResource(API_ENDPOINTS.events, toEventApiPayload(event), "event");
    return loadEvents();
  },
  async updateEvent(eventId: string, event: Omit<ChurchEvent, "id">): Promise<ChurchEvent[]> {
    await updateResource(API_ENDPOINTS.events, eventId, toEventApiPayload(event), "event");
    return loadEvents();
  },
  async deleteEvent(eventId: string): Promise<ChurchEvent[]> {
    await deleteResource(API_ENDPOINTS.events, eventId, "event");
    return loadEvents();
  },
  async updateTxn(txnId: string, txn: Partial<Omit<Txn, "id">>) {
    await updateResource(
      API_ENDPOINTS.transactions,
      txnId,
      toTransactionApiPayload(txn),
      "transaction",
    );
    await loadTransactions();
  },
  async deleteTxn(txnId: string) {
    await deleteResource(API_ENDPOINTS.transactions, txnId, "transaction");
    await loadTransactions();
  },
};

function toEventApiPayload(event: Omit<ChurchEvent, "id">) {
  return {
    title: event.title,
    date: event.date,
    location: event.location,
    attendees_count: event.attendeesCount,
    total_expense: event.totalExpense,
    donations_collected: event.donations,
    food_menu: event.foodMenu,
  };
}

function toTransactionApiPayload(transaction: Partial<Omit<Txn, "id">>) {
  return {
    ...transaction,
    ...(typeof transaction.description === "string"
      ? { title: transaction.description }
      : {}),
  };
}

async function updateResource(endpoint: string, id: string, value: unknown, key: string) {
  if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");

  const response = await fetchApi(`${endpoint}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!response.ok) await throwApiError(response, `Failed to update ${key}`);
}

async function createResource(endpoint: string, value: unknown, key: string) {
  if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");
  const response = await fetchApi(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!response.ok) await throwApiError(response, `Failed to create ${key}`);
}

async function deleteResource(endpoint: string, id: string, key: string) {
  if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");
  const response = await fetchApi(`${endpoint}/${id}`, { method: "DELETE" });
  if (!response.ok) await throwApiError(response, `Failed to delete ${key}`);
}

/* ---------- derived helpers ---------- */

export function attendedCount(attendance: string[], studentId: string) {
  return attendance.filter((k) => k.startsWith(studentId + "|")).length;
}

export function attendanceRate(attendance: string[], studentId: string) {
  return Math.round((attendedCount(attendance, studentId) / allSundays.length) * 100);
}

export function monthOf(iso: string) {
  return iso.slice(0, 7);
}

export type DateFilter = { year: string; month: string };

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const ALL_DATE_FILTER: DateFilter = { year: "all", month: "all" };

export function matchesDate(iso: string, filter: DateFilter) {
  return (
    (filter.year === "all" || iso.slice(0, 4) === filter.year) &&
    (filter.month === "all" || iso.slice(5, 7) === filter.month)
  );
}

export function monthlyTotals(txns: Txn[], filter: DateFilter) {
  const rows = txns.filter((t) => matchesDate(t.date, filter));
  const income = rows.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const expense = rows.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
  return { income, expense, net: income - expense, rows };
}
export const generateSundays = (): string[] => {
  const sundays: string[] = [];
  const start = new Date("2024-01-01");
  const end = new Date();
  end.setMonth(end.getMonth() + 6);

  const current = new Date(start);
  while (current <= end) {
    if (current.getDay() === 0) {
      sundays.push(current.toISOString().split("T")[0]!);
    }
    current.setDate(current.getDate() + 1);
  }
  return sundays;
};

export const allSundays = generateSundays();
