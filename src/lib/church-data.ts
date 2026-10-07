export type Gender = "Male" | "Female" | "Unknown";

export function isGender(value: unknown): value is Gender {
  return value === "Male" || value === "Female";
}

export type Student = {
  id: string;
  name: string;
  nameMm: string;
  gender: Gender;
  age: number;
  grade: string;
  parentName: string;
  parentPhone: string;
  address: string;
  enrolled: string;
  gradient: string;
};

export type Course = {
  id: string;
  title: string;
  titleMm: string;
  date: string;
  time: string;
  instructor: string;
  teacherId?: string;
  active: boolean;
  enrolledStudentIds?: string[];
};

export const DEFAULT_ATTENDANCE_COURSES: Course[] = [
  "Bible Studies",
  "Computer Basic",
  "Guitar",
  "Thai Language",
].map((title) => ({
  id: `default-${title.toLowerCase().replaceAll(" ", "-")}`,
  title,
  titleMm: "",
  date: localDateString(),
  time: "",
  instructor: "",
  active: true,
}));

export type Teacher = {
  id: string;
  name: string;
  gender: Gender;
  phone: string;
  email: string;
  specialization: string;
  active?: boolean;
};

export type Staff = {
  id: string;
  name: string;
  gender: Gender;
  position: string;
  phone: string;
  email: string;
  salary: number;
  active?: boolean;
};

export type Completion = {
  courseId: string;
  studentId: string;
  date: string;
};

export type Txn = {
  id: string;
  date: string;
  type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  receipt?: string | undefined;
};

export type ChurchEvent = {
  id: string;
  title: string;
  date: string;
  location: string;
  attendeesCount: number;
  foodMenu: string;
  totalExpense: string | number;
  donations: string | number;
};

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function sundays(year = new Date().getUTCFullYear()): string[] {
  const out: string[] = [];
  const d = new Date(Date.UTC(year, 0, 1));
  const today = new Date();
  const end = new Date(
    Date.UTC(
      year === today.getUTCFullYear() ? today.getUTCFullYear() : year,
      year === today.getUTCFullYear() ? today.getUTCMonth() : 11,
      year === today.getUTCFullYear() ? today.getUTCDate() : 31,
    ),
  );
  while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() + 1);
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return out;
}

export const allSundays = sundays();

export function formatKs(n: number) {
  return "Ks " + n.toLocaleString("en-US");
}

export function formatShort(n: number) {
  if (n >= 1_000_000) return "Ks " + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "Ks " + Math.round(n / 1000) + "K";
  return "Ks " + n;
}

export function formatThb(n: number) {
  return "฿" + n.toLocaleString("en-US");
}

export function formatShortThb(n: number) {
  if (n >= 1_000_000) return "฿" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "฿" + Math.round(n / 1000) + "K";
  return formatThb(n);
}

export function parseNumericValue(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const normalized = value
    .trim()
    .replaceAll(",", "")
    .replace(/[^\d.-]/g, "");
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return null;

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function formatDate(iso: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00Z`) : new Date(iso);
  if (!Number.isFinite(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
