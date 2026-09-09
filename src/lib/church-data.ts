export type Student = {
  id: string;
  name: string;
  nameMm: string;
  age: number;
  grade: number;
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
};

export type Teacher = {
  id: string;
  name: string;
  phone: string;
  email: string;
  specialty: string;
  active?: boolean;
};

export type Staff = {
  id: string;
  name: string;
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

export function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function formatDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
