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

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");

const API_ENDPOINTS = {
  health: "/api/test",
} as const;

async function checkBackend() {
  if (!apiBaseUrl) return false;
  try {
    const response = await fetch(`${apiBaseUrl}${API_ENDPOINTS.health}`);
    return response.ok;
  } catch {
    return false;
  }
}

async function loadFromApi() {
  await checkBackend();
  set({
    students: [],
    attendance: [],
    courses: [],
    completions: [],
    txns: [],
  });
}

export const actions = {
  async addStudent(s: Omit<Student, "id" | "gradient">) {
    void s;
    return "";
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
