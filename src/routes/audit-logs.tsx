import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { roleLabel, useCurrentRole } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/church-store";

type AuditLog = {
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

function displayValue(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function logValue(log: AuditLog, key: keyof AuditLog) {
  return displayValue(log[key]);
}

function normalizeLogs(payload: unknown): AuditLog[] {
  if (Array.isArray(payload)) return payload as AuditLog[];
  if (payload && typeof payload === "object") {
    const source = payload as { logs?: unknown; data?: unknown };
    const records = source.logs ?? source.data;
    return Array.isArray(records) ? records as AuditLog[] : [];
  }
  return [];
}

export const Route = createFileRoute("/audit-logs")({
  head: () => ({
    meta: [
      { title: "Activity Logs — House Of Prayer Assembly Sunday School OS" },
      { name: "description", content: "Review administrator activity across the Sunday School OS." },
    ],
  }),
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const role = useCurrentRole();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/audit-logs`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Request failed with ${response.status}`);
        return normalizeLogs(await response.json());
      })
      .then((records) => {
        setLogs(records);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, []);

  const actions = useMemo(
    () => [...new Set(logs.map((log) => logValue(log, "action")).filter((value) => value !== "—"))].sort(),
    [logs],
  );
  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesAction = action === "all" || logValue(log, "action") === action;
      const matchesQuery = !normalizedQuery || [log.userId, log.user_id, log.userRole, log.user_role, log.resource, log.details]
        .map(displayValue)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
      return matchesAction && matchesQuery;
    });
  }, [action, logs, query]);

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Admin only · {roleLabel(role)}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Activity Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">A traceable record of changes made across the workspace.</p>
        </div>
        <Panel
          title="Audit trail"
          mm={`${filteredLogs.length} of ${logs.length} events`}
          right={<span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] text-accent">ADMIN</span>}
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="field w-full pl-9" placeholder="Search user, role, resource, or details" aria-label="Search audit logs" />
            </label>
            <select value={action} onChange={(event) => setAction(event.target.value)} className="field sm:w-48" aria-label="Filter by action">
              <option value="all">All actions</option>
              {actions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          {status === "loading" && <p className="py-12 text-center text-sm text-muted-foreground">Loading activity logs…</p>}
          {status === "error" && <p className="py-12 text-center text-sm text-rose">Unable to load activity logs. Please try again.</p>}
          {status === "ready" && filteredLogs.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No activity logs match your filters.</p>}
          {status === "ready" && filteredLogs.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow><TableHead>User ID / Role</TableHead><TableHead>Action</TableHead><TableHead>Resource</TableHead><TableHead>Details</TableHead><TableHead className="whitespace-nowrap">Timestamp</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log, index) => {
                  const timestamp = log.timestamp ?? log.createdAt ?? log.created_at;
                  return <TableRow key={log.id ?? `${timestamp ?? "log"}-${index}`}>
                    <TableCell><div className="font-medium">{displayValue(log.userId ?? log.user_id)}</div><div className="text-xs text-muted-foreground">{displayValue(log.userRole ?? log.user_role)}</div></TableCell>
                    <TableCell className="font-medium text-accent">{logValue(log, "action")}</TableCell>
                    <TableCell>{logValue(log, "resource")}</TableCell>
                    <TableCell className="max-w-xs break-words text-muted-foreground">{logValue(log, "details")}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{timestamp ? new Date(timestamp).toLocaleString() : "—"}</TableCell>
                  </TableRow>;
                })}
              </TableBody>
            </Table>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}