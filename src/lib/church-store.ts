import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { allSundays, type Completion, type Course, type Student, type Txn } from "./church-data";

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

export function formatApiError(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    return `Error (${error.status}): ${error.operation} - ${error.detail}`;
  }
  return `Error: ${error instanceof Error ? error.message : fallback}`;
}

export type ChurchState = {
  students: Student[];
  attendance: string[]; // `${studentId}|${sunday}`
  courses: Course[];
  completions: Completion[];
  txns: Txn[];
};

let state: ChurchState = { students: [], attendance: [], courses: [], completions: [], txns: [] };
let loadPromise: Promise<void> | undefined;

const listeners = new Set<() => void>();
const API_TIMEOUT_MS = 10_000;

function set(next: Partial<ChurchState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot() {
  return state;
}

export function useChurch() {
  useEffect(() => {
    if (!loadPromise) loadPromise = loadFromApi();
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");

const API_ENDPOINTS = {
  health: "/api/test",
  students: "/api/students",
  courses: "/api/courses",
  attendance: "/api/attendance",
  transactions: "/api/finance",
} as const;

async function fetchApi(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE_URL}${path}`, { ...init, signal: controller.signal });
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

export async function loadAttendance() {
  const records = await loadResource<
    string | { studentId: string; date: string; present?: boolean }
  >(API_ENDPOINTS.attendance, "attendance");
  const attendance = records.flatMap((record) => {
    if (typeof record === "string") return [record];
    return record.present === false ? [] : [`${record.studentId}|${record.date}`];
  });
  set({ attendance });
  return attendance;
}

export async function loadTransactions() {
  const txns = await loadResource<Txn>(API_ENDPOINTS.transactions, "transactions");
  set({ txns });
  return txns;
}

async function loadFromApi() {
  if (await checkBackend()) {
    try {
      await loadStudents();
      await Promise.all([loadCourses(), loadAttendance(), loadTransactions()]);
      return;
    } catch (error) {
      toast.error(formatApiError(error, "Unable to load church data"));
      return;
    }
  }
  set({ students: [], attendance: [], courses: [], completions: [], txns: [] });
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
  async toggleAttendance(studentId: string, day: string) {
    void studentId;
    void day;
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
  async updateAttendance(studentId: string, attendance: { date: string; present: boolean }) {
    await updateResource(API_ENDPOINTS.attendance, studentId, attendance, "attendance");
    await loadAttendance();
  },
  async toggleCompletion(courseId: string, studentId: string, date: string) {
    void courseId;
    void studentId;
    void date;
  },
  async addTxn(t: Omit<Txn, "id">) {
    if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");

    const response = await fetchApi(API_ENDPOINTS.transactions, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t),
    });
    if (!response.ok) await throwApiError(response, "Failed to create transaction");

    await loadTransactions();
  },
  async updateTxn(txnId: string, txn: Partial<Omit<Txn, "id">>) {
    await updateResource(API_ENDPOINTS.transactions, txnId, txn, "transaction");
    await loadTransactions();
  },
};

async function updateResource(endpoint: string, id: string, value: unknown, key: string) {
  if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");

  const response = await fetchApi(`${endpoint}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!response.ok) await throwApiError(response, `Failed to update ${key}`);
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
export { allSundays };
