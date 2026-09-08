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

async function loadFromApi() {
  if (await checkBackend()) {
    try {
      await loadStudents();
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
  async toggleAttendance(studentId: string, day: string) {
    void studentId;
    void day;
  },
  async addCourse(c: Omit<Course, "id" | "active" | "titleMm">) {
    void c;
  },
  async toggleCompletion(courseId: string, studentId: string, date: string) {
    void courseId;
    void studentId;
    void date;
  },
  async addTxn(t: Omit<Txn, "id">) {
    void t;
  },
};

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
