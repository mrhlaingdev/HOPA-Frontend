import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  CalendarDays,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  UsersRound,
  Utensils,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { type ChurchEvent, formatDate, formatKs, parseNumericValue } from "@/lib/church-data";
import { usePermission } from "@/lib/auth";
import { actions, formatApiError, loadEvents } from "@/lib/church-store";
import { downloadCsv } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events — House Of Prayer Assembly Sunday School OS" },
      {
        name: "description",
        content: "Manage church events, attendance, catering, expenses and donations.",
      },
    ],
  }),
  component: EventsPage,
});

type EventForm = Omit<ChurchEvent, "id" | "totalExpense" | "donations"> & {
  totalExpense: string;
  donations: string;
};

const exportHeaders = [
  "Event Title",
  "Date",
  "Location",
  "Attendees Count",
  "Food Menu",
  "Total Expense",
  "Donations Collected",
];

const emptyForm = (): EventForm => ({
  title: "",
  date: new Date().toLocaleDateString("en-CA"),
  location: "",
  attendeesCount: 0,
  foodMenu: "",
  totalExpense: "",
  donations: "",
});

function EventsPage() {
  const canManage = usePermission("manage-events");
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [query, setQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChurchEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<ChurchEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<ChurchEvent | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    loadEvents()
      .then((result) => {
        if (active) setEvents(result);
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = formatApiError(error, "Unable to load events");
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const years = [...new Set(events.map((event) => event.date.slice(0, 4)))].sort((a, b) =>
    b.localeCompare(a),
  );
  const visibleEvents = events
    .filter((event) => {
      const searchText = query.trim().toLowerCase();
      const [year, month] = event.date.split("-");
      return (
        (!searchText ||
          event.title.toLowerCase().includes(searchText) ||
          event.location.toLowerCase().includes(searchText)) &&
        (selectedYear === "all" || year === selectedYear) &&
        (selectedMonth === "all" || month === selectedMonth)
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  const totalExpense = visibleEvents.reduce(
    (total, event) => total + (parseEventAmount(event.totalExpense) ?? 0),
    0,
  );
  const totalAttendees = visibleEvents.reduce((total, event) => total + event.attendeesCount, 0);
  const exportRows = visibleEvents.map((event) => [
    event.title,
    formatDate(event.date),
    event.location,
    event.attendeesCount,
    event.foodMenu,
    formatEventAmount(event.totalExpense),
    formatEventAmount(event.donations),
  ]);

  function exportExcel() {
    const excelRows = visibleEvents.map((event) => [
      event.title,
      formatDate(event.date),
      event.location,
      event.attendeesCount,
      event.foodMenu,
      parseEventAmount(event.totalExpense) ?? formatEventAmount(event.totalExpense),
      parseEventAmount(event.donations) ?? formatEventAmount(event.donations),
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([exportHeaders, ...excelRows]);
    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 16 },
      { wch: 28 },
      { wch: 18 },
      { wch: 48 },
      { wch: 20 },
      { wch: 22 },
    ];
    worksheet["!autofilter"] = {
      ref: `A1:G${Math.max(1, excelRows.length + 1)}`,
    };
    for (let row = 2; row <= excelRows.length + 1; row += 1) {
      worksheet[`D${row}`].z = "#,##0";
      for (const column of ["F", "G"]) {
        const cell = worksheet[`${column}${row}`];
        if (cell && typeof cell.v === "number") cell.z = '#,##0 "Ks"';
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Events");
    XLSX.writeFile(workbook, "events-report.xlsx");
  }

  function exportPdf() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Allow pop-ups to open the printable event report.");
      return;
    }

    const escapeHtml = (value: unknown) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    const tableRows = exportRows
      .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`)
      .join("");
    const emptyRow =
      exportRows.length === 0
        ? `<tr><td colspan="${exportHeaders.length}" class="empty">No events match the selected filters.</td></tr>`
        : "";

    printWindow.document.write(`<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Events Report</title>
          <style>
            @page { size: landscape; margin: 16mm; }
            body { color: #172033; font: 12px/1.5 Arial, sans-serif; }
            h1 { margin: 0; color: #142b4a; font-size: 24px; }
            .meta { margin: 4px 0 20px; color: #5d6879; }
            table { width: 100%; border-collapse: collapse; table-layout: auto; }
            th { background: #183b5b; color: white; text-align: left; }
            th, td { border: 1px solid #d6dce5; padding: 8px; vertical-align: top; }
            tbody tr:nth-child(even) { background: #f1f5f9; }
            td { white-space: pre-wrap; overflow-wrap: anywhere; }
            .empty { text-align: center; color: #5d6879; }
          </style>
        </head>
        <body>
          <h1>Events Report</h1>
          <p class="meta">${exportRows.length} ${exportRows.length === 1 ? "event" : "events"} · Generated ${escapeHtml(new Date().toLocaleString())}</p>
          <table>
            <thead><tr>${exportHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
            <tbody>${tableRows}${emptyRow}</tbody>
          </table>
        </body>
      </html>`);
    printWindow.document.close();
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  }

  function openAddDialog() {
    setEditing(null);
    setForm(emptyForm());
    setFormError("");
    setDialogOpen(true);
  }

  function openEditDialog(event: ChurchEvent) {
    setEditing(event);
    setForm({
      title: event.title,
      date: event.date,
      location: event.location,
      attendeesCount: event.attendeesCount,
      foodMenu: event.foodMenu,
      totalExpense: String(event.totalExpense ?? ""),
      donations: String(event.donations ?? ""),
    });
    setFormError("");
    setDialogOpen(true);
  }

  async function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateEvent(form);
    setFormError(validationError);
    if (validationError) return;

    setIsSaving(true);
    try {
      if (editing) {
        setEvents(await actions.updateEvent(editing.id, form));
        toast.success("Event updated successfully.");
      } else {
        setEvents(await actions.addEvent(form));
        toast.success("Event created successfully.");
      }
      setDialogOpen(false);
    } catch (error) {
      const message = formatApiError(error, "Unable to save event");
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDeleteEvent() {
    if (!eventToDelete) return;
    setIsDeleting(true);
    try {
      setEvents(await actions.deleteEvent(eventToDelete.id));
      setEventToDelete(null);
      setDetailEvent(null);
      toast.success("Event deleted successfully.");
    } catch (error) {
      toast.error(formatApiError(error, "Unable to delete event"));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AppShell search={query} onSearch={setQuery}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Events</h1>
          <p className="text-[11px] text-muted-foreground">ပွဲအခမ်းအနား စီမံခန့်ခွဲမှု</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Button onClick={openAddDialog} className="gap-2">
              <Plus className="size-4" />
              Add Event
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="gap-2">
                <Download className="size-4" />
                Export
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => downloadCsv("events-report.csv", exportHeaders, exportRows)}
              >
                <FileText />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={exportExcel}>
                <FileSpreadsheet />
                Export Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={exportPdf}>
                <FileText />
                Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total Events"
          value={visibleEvents.length.toLocaleString()}
          icon={CalendarDays}
        />
        <SummaryCard label="Total Expense" value={formatKs(totalExpense)} icon={Utensils} />
        <SummaryCard
          label="Total Attendees"
          value={totalAttendees.toLocaleString()}
          icon={UsersRound}
        />
      </div>

      <section className="glass rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display font-semibold">All Events</h2>
            <p className="text-[11px] text-muted-foreground">
              {visibleEvents.length} {visibleEvents.length === 1 ? "event" : "events"}
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <label className="relative min-w-48 flex-1 sm:flex-none" htmlFor="event-search">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="event-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title or location"
                className="field w-full py-2 pl-9 pr-3 text-xs"
              />
            </label>
            <label className="sr-only" htmlFor="event-year-filter">
              Filter events by year
            </label>
            <select
              id="event-year-filter"
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              className="field px-3 py-2 text-xs"
            >
              <option value="all">All Years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="event-month-filter">
              Filter events by month
            </label>
            <select
              id="event-month-filter"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="field px-3 py-2 text-xs"
            >
              <option value="all">All Months</option>
              {Array.from({ length: 12 }, (_, index) => {
                const month = String(index + 1).padStart(2, "0");
                return (
                  <option key={month} value={month}>
                    {new Date(Date.UTC(2020, index)).toLocaleString("en", {
                      month: "short",
                      timeZone: "UTC",
                    })}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        ) : loadError ? (
          <p role="alert" className="py-10 text-center text-sm text-rose">
            {loadError}
          </p>
        ) : visibleEvents.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            description={
              events.length === 0
                ? "No events yet. Add an event to start keeping track."
                : "No events match your search."
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleEvents.map((event) => (
              <article
                key={event.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold">{event.title}</h3>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      aria-label={`Edit ${event.title}`}
                      onClick={() => openEditDialog(event)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  )}
                </div>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <CalendarDays className="size-4 shrink-0" />
                    {formatDate(event.date)}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="size-4 shrink-0" />
                    {event.location}
                  </p>
                  <p className="flex items-center gap-2">
                    <UsersRound className="size-4 shrink-0" />
                    {event.attendeesCount.toLocaleString()} attendees
                  </p>
                  {event.foodMenu && (
                    <p className="flex items-start gap-2">
                      <Utensils className="mt-0.5 size-4 shrink-0" />
                      <span className="line-clamp-2 whitespace-pre-line break-words">
                        {event.foodMenu}
                      </span>
                    </p>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-white/10 pt-3 text-xs">
                  <span className="text-muted-foreground">
                    Expense{" "}
                    <strong className="ml-1 text-foreground">
                      {formatEventAmount(event.totalExpense)}
                    </strong>
                  </span>
                  <span className="text-muted-foreground">
                    Donations{" "}
                    <strong className="ml-1 text-mint">{formatEventAmount(event.donations)}</strong>
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => setDetailEvent(event)}
                >
                  View details
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!detailEvent} onOpenChange={(open) => !open && setDetailEvent(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {detailEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{detailEvent.title}</DialogTitle>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="size-4 shrink-0" />
                  {formatDate(detailEvent.date)}
                </p>
              </DialogHeader>
              <dl className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Location">
                  <span className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="break-words">{detailEvent.location || "—"}</span>
                  </span>
                </DetailField>
                <DetailField label="Attendees">
                  <span className="flex items-center gap-2">
                    <UsersRound className="size-4 shrink-0 text-muted-foreground" />
                    {detailEvent.attendeesCount.toLocaleString()}
                  </span>
                </DetailField>
                <DetailField label="Food Menu / Catering" className="sm:col-span-2">
                  <span className="flex items-start gap-2">
                    <Utensils className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="whitespace-pre-wrap break-words">
                      {detailEvent.foodMenu.trim() || "No food or catering details provided."}
                    </span>
                  </span>
                </DetailField>
                <DetailField label="Total Expense">
                  {formatEventAmount(detailEvent.totalExpense)}
                </DetailField>
                <DetailField label="Donations Collected">
                  {formatEventAmount(detailEvent.donations)}
                </DetailField>
              </dl>
              {canManage && (
                <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isDeleting}
                    onClick={() => setEventToDelete(detailEvent)}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const eventToEdit = detailEvent;
                      setDetailEvent(null);
                      openEditDialog(eventToEdit);
                    }}
                  >
                    <Pencil className="size-4" />
                    Edit Event
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!eventToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setEventToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteEvent();
              }}
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Event" : "Add Event"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitEvent}>
            {formError && (
              <p role="alert" className="text-sm text-rose">
                {formError}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Event Title" htmlFor="event-title" className="sm:col-span-2">
                <input
                  id="event-title"
                  className="field mt-1 w-full px-3 py-2 text-sm"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Date" htmlFor="event-date">
                <input
                  id="event-date"
                  type="date"
                  className="field mt-1 w-full px-3 py-2 text-sm"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Location" htmlFor="event-location">
                <input
                  id="event-location"
                  className="field mt-1 w-full px-3 py-2 text-sm"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Attendees Count" htmlFor="event-attendees">
                <input
                  id="event-attendees"
                  type="number"
                  min="0"
                  step="1"
                  className="field mt-1 block w-full min-w-0 px-3 py-2 text-sm"
                  value={form.attendeesCount}
                  onChange={(e) => setForm({ ...form, attendeesCount: e.target.valueAsNumber })}
                  required
                />
              </FormField>
              <FormField
                label="Food Menu / Catering Details"
                htmlFor="event-food"
                className="sm:col-span-2"
              >
                <textarea
                  id="event-food"
                  className="field mt-1 min-h-20 w-full px-3 py-2 text-sm"
                  value={form.foodMenu}
                  onChange={(e) => setForm({ ...form, foodMenu: e.target.value })}
                />
              </FormField>
              <FormField label="Total Expense (Ks)" htmlFor="event-expense">
                <input
                  id="event-expense"
                  type="text"
                  inputMode="text"
                  className="field mt-1 block w-full min-w-0 px-3 py-2 text-sm"
                  value={form.totalExpense}
                  onChange={(e) => setForm({ ...form, totalExpense: e.target.value })}
                />
              </FormField>
              <FormField label="Donations (Ks)" htmlFor="event-donations">
                <input
                  id="event-donations"
                  type="text"
                  inputMode="text"
                  className="field mt-1 block w-full min-w-0 px-3 py-2 text-sm"
                  value={form.donations}
                  onChange={(e) => setForm({ ...form, donations: e.target.value })}
                />
              </FormField>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving…" : editing ? "Save Changes" : "Add Event"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function validateEvent(form: EventForm) {
  if (!form.title.trim()) return "Event title is required.";
  if (!form.date) return "Event date is required.";
  if (!form.location.trim()) return "Event location is required.";
  if (!Number.isInteger(form.attendeesCount) || form.attendeesCount < 0)
    return "Attendees count must be a non-negative whole number.";
  return "";
}

function parseEventAmount(value: string | number): number | null {
  return parseNumericValue(value);
}

function formatEventAmount(value: string | number) {
  const amount = parseEventAmount(value);
  if (amount !== null) return formatKs(amount);
  return String(value).trim() || "—";
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof CalendarDays;
}) {
  return (
    <div className="glass flex items-center justify-between rounded-2xl p-5">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      </div>
      <div className="grid size-11 place-items-center rounded-xl bg-accent/10 text-accent">
        <Icon className="size-5" />
      </div>
    </div>
  );
}

function DetailField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <dt className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className={`block text-xs font-medium ${className ?? ""}`}>
      {label}
      {children}
    </label>
  );
}
