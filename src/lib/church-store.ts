import { useSyncExternalStore } from "react";
import { allSundays, type Completion, type Course, type Student, type Txn } from "./church-data";

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
  if (typeof window !== "undefined" && !loadPromise) {
    loadPromise = loadFromApi();
  }
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

async function checkBackend() {
  if (!API_BASE_URL) return false;
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.health}`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function loadStudents() {
  if (!API_BASE_URL) return [];

  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.students}`);
  if (!response.ok) throw new Error(`Failed to load students (${response.status})`);

  const data = (await response.json()) as Student[] | { students?: Student[] };
  const students = Array.isArray(data) ? data : (data.students ?? []);
  set({ students });
  return students;
}

async function loadResource<T>(endpoint: string, key: string): Promise<T[]> {
  if (!API_BASE_URL) return [];

  const response = await fetch(`${API_BASE_URL}${endpoint}`);
  if (!response.ok) throw new Error(`Failed to load ${key} (${response.status})`);

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
    } catch {
      return;
    }
  }
  set({ students: [], attendance: [], courses: [], completions: [], txns: [] });
}

export const actions = {
  async addStudent(s: Omit<Student, "id" | "gradient">) {
    if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");

    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.students}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    if (!response.ok) throw new Error(`Failed to create student (${response.status})`);

    const created = response.status === 204 ? {} : ((await response.json()) as Partial<Student>);
    const students = await loadStudents();
    return created.id ?? students.find((student) => student.name === s.name)?.id ?? "";
  },
  async deleteStudent(studentId: string) {
    if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");

    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.students}/${studentId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error(`Failed to delete student (${response.status})`);

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

    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.courses}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(c),
    });
    if (!response.ok) throw new Error(`Failed to create course (${response.status})`);

    await loadCourses();
  },
  async deleteCourse(courseId: string) {
    if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");

    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.courses}/${courseId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error(`Failed to delete course (${response.status})`);

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
    void t;
  },
  async updateTxn(txnId: string, txn: Partial<Omit<Txn, "id">>) {
    await updateResource(API_ENDPOINTS.transactions, txnId, txn, "transaction");
    await loadTransactions();
  },
};

async function updateResource(endpoint: string, id: string, value: unknown, key: string) {
  if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");

  const response = await fetch(`${API_BASE_URL}${endpoint}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!response.ok) throw new Error(`Failed to update ${key} (${response.status})`);
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

export function monthlyTotals(txns: Txn[], month: string) {
  const rows = txns.filter((t) => monthOf(t.date) === month);
  const income = rows.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const expense = rows.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
  return { income, expense, net: income - expense, rows };
}

export const CURRENT_MONTH = new Date().toISOString().slice(0, 7);
export { allSundays };
