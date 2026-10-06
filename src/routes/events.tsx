import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { CalendarDays, MapPin, Pencil, Plus, UsersRound, Utensils } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { type ChurchEvent, formatDate, formatKs } from "@/lib/church-data";
import { usePermission } from "@/lib/auth";
import { actions, formatApiError, loadEvents } from "@/lib/church-store";
import { toast } from "sonner";

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

type EventForm = Omit<ChurchEvent, "id">;

const emptyForm = (): EventForm => ({
  title: "",
  date: new Date().toLocaleDateString("en-CA"),
  location: "",
  attendeesCount: 0,
  foodMenu: "",
  totalExpense: 0,
  donations: 0,
});

function EventsPage() {
  const canManage = usePermission("manage-events");
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChurchEvent | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [formError, setFormError] = useState("");

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

  const visibleEvents = events
    .filter((event) => {
      const searchText = query.trim().toLowerCase();
      return (
        !searchText ||
        event.title.toLowerCase().includes(searchText) ||
        event.location.toLowerCase().includes(searchText)
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  const totalExpense = events.reduce((total, event) => total + event.totalExpense, 0);
  const totalAttendees = events.reduce((total, event) => total + event.attendeesCount, 0);

  function openAddDialog() {
    setEditing(null);
    setForm(emptyForm());
    setFormError("");
    setDialogOpen(true);
  }

  function openEditDialog(event: ChurchEvent) {
    const { id: _id, ...eventForm } = event;
    setEditing(event);
    setForm(eventForm);
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

  return (
    <AppShell search={query} onSearch={setQuery}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Events</h1>
          <p className="text-[11px] text-muted-foreground">ပွဲအခမ်းအနား စီမံခန့်ခွဲမှု</p>
        </div>
        {canManage && (
          <Button onClick={openAddDialog} className="gap-2">
            <Plus className="size-4" />
            Add Event
          </Button>
        )}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total Events"
          value={events.length.toLocaleString()}
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
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display font-semibold">All Events</h2>
            <p className="text-[11px] text-muted-foreground">
              {visibleEvents.length} {visibleEvents.length === 1 ? "event" : "events"}
            </p>
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
                      <span>{event.foodMenu}</span>
                    </p>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-white/10 pt-3 text-xs">
                  <span className="text-muted-foreground">
                    Expense{" "}
                    <strong className="ml-1 text-foreground">{formatKs(event.totalExpense)}</strong>
                  </span>
                  <span className="text-muted-foreground">
                    Donations{" "}
                    <strong className="ml-1 text-mint">{formatKs(event.donations)}</strong>
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

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
                  className="field mt-1 w-full px-3 py-2 text-sm"
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
                  type="number"
                  min="0"
                  step="1"
                  className="field mt-1 w-full px-3 py-2 text-sm"
                  value={form.totalExpense}
                  onChange={(e) => setForm({ ...form, totalExpense: e.target.valueAsNumber })}
                  required
                />
              </FormField>
              <FormField label="Donations (Ks)" htmlFor="event-donations">
                <input
                  id="event-donations"
                  type="number"
                  min="0"
                  step="1"
                  className="field mt-1 w-full px-3 py-2 text-sm"
                  value={form.donations}
                  onChange={(e) => setForm({ ...form, donations: e.target.valueAsNumber })}
                  required
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
  if (!Number.isFinite(form.totalExpense) || form.totalExpense < 0)
    return "Total expense must be a non-negative number.";
  if (!Number.isFinite(form.donations) || form.donations < 0)
    return "Donations must be a non-negative number.";
  return "";
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
