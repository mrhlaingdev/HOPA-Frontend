import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil, Trash2, WalletCards } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell, Panel } from "@/components/AppShell";
import { ExportDropdown } from "@/components/ExportDropdown";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { DateFilters } from "@/components/DateFilters";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ALL_DATE_FILTER,
  actions,
  formatApiError,
  loadEvents,
  matchesDate,
  monthlyTotals,
  useChurch,
} from "@/lib/church-store";
import {
  type ChurchEvent,
  formatDate,
  formatShortThb,
  formatThb,
  parseNumericValue,
} from "@/lib/church-data";
import { toast } from "sonner";
import { usePermission } from "@/lib/auth";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "Petty Cash & Finance — House Of Prayer Assembly Sunday School OS" },
      {
        name: "description",
        content:
          "Record church offerings and expenses, attach voucher or receipt photos, and review the monthly income, expense and net balance report.",
      },
      {
        property: "og:title",
        content: "Petty Cash & Finance — House Of Prayer Assembly Sunday School OS",
      },
      {
        property: "og:description",
        content: "Income and expense ledger with receipt image uploads and monthly summaries.",
      },
    ],
  }),
  component: FinancePage,
});

const emptyTxn = {
  date: "2026-09-06",
  type: "income" as "income" | "expense",
  category: "Sunday Offering",
  description: "",
  amount: 0,
  receipt: undefined as string | undefined,
};

function FinancePage() {
  const canManage = usePermission("manage-finance");
  const canDelete = usePermission("delete-records");
  const { txns, isLoading } = useChurch();
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [areEventsLoading, setAreEventsLoading] = useState(true);
  const [eventLoadError, setEventLoadError] = useState("");
  const [q, setQ] = useState("");
  const [dateFilter, setDateFilter] = useState(ALL_DATE_FILTER);
  const [form, setForm] = useState(emptyTxn);
  const [formError, setFormError] = useState("");
  const [viewing, setViewing] = useState<string | null>(null);
  const [editing, setEditing] = useState<(typeof txns)[number] | null>(null);
  const [editForm, setEditForm] = useState(emptyTxn);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    let active = true;
    loadEvents()
      .then((result) => {
        if (active) setEvents(result);
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = formatApiError(error, "Unable to load event finances");
        setEventLoadError(message);
        toast.error(message);
      })
      .finally(() => {
        if (active) setAreEventsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const totals = monthlyTotals(txns, dateFilter);
  const filteredEvents = events.filter((event) => matchesDate(event.date, dateFilter));
  const eventExpenses = filteredEvents.reduce(
    (sum, event) => sum + (parseNumericValue(event.totalExpense) ?? 0),
    0,
  );
  const eventDonations = filteredEvents.reduce(
    (sum, event) => sum + (parseNumericValue(event.donations) ?? 0),
    0,
  );
  const totalIncome = totals.income + eventDonations;
  const totalExpense = totals.expense + eventExpenses;
  const netBalance = totalIncome - totalExpense;
  const monthlyAnalytics = new Map<
    string,
    { period: string; income: number; expenses: number }
  >();
  for (const transaction of totals.rows) {
    const period = transaction.date.slice(0, 7);
    const entry = monthlyAnalytics.get(period) ?? {
      period,
      income: 0,
      expenses: 0,
    };
    if (transaction.type === "income") entry.income += transaction.amount;
    else entry.expenses += transaction.amount;
    monthlyAnalytics.set(period, entry);
  }
  for (const event of filteredEvents) {
    const period = event.date.slice(0, 7);
    const entry = monthlyAnalytics.get(period) ?? {
      period,
      income: 0,
      expenses: 0,
    };
    entry.income += parseNumericValue(event.donations) ?? 0;
    entry.expenses += parseNumericValue(event.totalExpense) ?? 0;
    monthlyAnalytics.set(period, entry);
  }
  const monthlyChartData = [...monthlyAnalytics.values()]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((entry) => ({
      ...entry,
      label: new Date(`${entry.period}-01T00:00:00Z`).toLocaleDateString("en", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
    }));
  const expenseCategories = new Map<string, number>();
  for (const transaction of totals.rows) {
    if (transaction.type !== "expense") continue;
    const category = transaction.category.trim() || "Uncategorized";
    expenseCategories.set(
      category,
      (expenseCategories.get(category) ?? 0) + transaction.amount,
    );
  }
  if (eventExpenses > 0) {
    expenseCategories.set("Events", (expenseCategories.get("Events") ?? 0) + eventExpenses);
  }
  const categoryChartData = [...expenseCategories.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const categoryColors = [
    "#34d399",
    "#38bdf8",
    "#818cf8",
    "#fbbf24",
    "#fb7185",
    "#c084fc",
    "#2dd4bf",
    "#f97316",
  ];
  const rows = totals.rows.filter(
    (t) =>
      t.description.toLowerCase().includes(q.toLowerCase()) ||
      t.category.toLowerCase().includes(q.toLowerCase()),
  );

  const validateTransaction = (transaction: typeof emptyTxn) => {
    if (!transaction.date) return "Transaction date is required.";
    if (!transaction.category.trim()) return "Category is required.";
    if (!transaction.description.trim()) return "Description is required.";
    if (!Number.isFinite(transaction.amount) || transaction.amount <= 0)
      return "Amount must be greater than 0.";
    return "";
  };

  async function deleteTransaction(transaction: (typeof txns)[number]) {
    if (!canDelete || !window.confirm(`Delete transaction "${transaction.description}"?`)) return;
    try {
      await actions.deleteTxn(transaction.id);
      toast.success("Transaction deleted successfully.");
    } catch (error) {
      toast.error(formatApiError(error, "Unable to delete transaction"));
    }
  }

  function onFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, receipt: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  function onEditFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEditForm((f) => ({ ...f, receipt: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  return (
    <AppShell search={q} onSearch={setQ}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Petty Cash &amp; Finance</h1>
          <p className="text-[11px] text-muted-foreground">ငွေစာရင်း စီမံခန့်ခွဲမှု</p>
        </div>
        <DateFilters
          value={dateFilter}
          onChange={setDateFilter}
          dates={[...txns.map((txn) => txn.date), ...events.map((event) => event.date)]}
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="glass rounded-2xl col-span-12 p-5 sm:col-span-6 xl:col-span-3">
          <p className="text-muted-foreground text-sm">Total Income (฿)</p>
          <p className="mt-1 text-3xl font-display font-bold text-mint">
            {formatShortThb(totalIncome)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{formatThb(totalIncome)}</p>
        </div>
        <div className="glass rounded-2xl col-span-12 p-5 sm:col-span-6 xl:col-span-3">
          <p className="text-muted-foreground text-sm">Total Expenses (฿)</p>
          <p className="mt-1 text-3xl font-display font-bold text-rose">
            {formatShortThb(totalExpense)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{formatThb(totalExpense)}</p>
        </div>
        <div className="glass rounded-2xl col-span-12 p-5 sm:col-span-6 xl:col-span-3">
          <p className="text-muted-foreground text-sm">Net Balance (฿) · လက်ကျန်</p>
          <p className="mt-1 text-3xl font-display font-bold">
            {netBalance >= 0 ? "+" : "−"}
            {formatShortThb(Math.abs(netBalance))}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {dateFilter.year === "all" ? "All years" : dateFilter.year} ·{" "}
            {dateFilter.month === "all" ? "All months" : "Selected month"}
          </p>
        </div>
        <div className="glass rounded-2xl col-span-12 p-5 sm:col-span-6 xl:col-span-3">
          <p className="text-muted-foreground text-sm">Event Expenses / Donations (฿)</p>
          {areEventsLoading ? (
            <p className="mt-2 text-xs text-muted-foreground">Loading event totals…</p>
          ) : eventLoadError ? (
            <p role="alert" className="mt-2 text-xs text-rose">
              Event totals unavailable.
            </p>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground">Expenses</p>
                <p className="font-display text-sm font-semibold text-rose">
                  {formatShortThb(eventExpenses)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Donations</p>
                <p className="font-display text-sm font-semibold text-mint">
                  {formatShortThb(eventDonations)}
                </p>
              </div>
            </div>
          )}
        </div>

        <section className="col-span-12" aria-label="Financial analytics">
          <div className="mb-3">
            <h2 className="font-display text-lg font-semibold">Analytics &amp; Charts</h2>
            <p className="text-xs text-muted-foreground">
              Income and expenses for the selected period, including event donations and expenses.
            </p>
          </div>
          <div className="grid grid-cols-12 gap-4">
            <Panel
              title="Monthly Income vs Expenses"
              mm={dateFilter.year === "all" ? "All years" : dateFilter.year}
              className="col-span-12 xl:col-span-7"
            >
              {monthlyChartData.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No financial data for the selected period.
                </p>
              ) : (
                <div className="h-[19rem] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyChartData}
                      margin={{ top: 12, right: 12, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#9ca3af", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#9ca3af", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value: number) => formatShortThb(value)}
                        width={78}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        contentStyle={{
                          backgroundColor: "#171b32",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 12,
                          color: "#f8fafc",
                        }}
                        labelStyle={{ color: "#cbd5e1", marginBottom: 6 }}
                        formatter={(value) => formatThb(Number(value))}
                      />
                      <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
                      <Bar
                        dataKey="income"
                        name="Income"
                        fill="#34d399"
                        radius={[5, 5, 0, 0]}
                      />
                      <Bar
                        dataKey="expenses"
                        name="Expenses"
                        fill="#fb7185"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel
              title="Expense by Category"
              mm={formatThb(totalExpense)}
              className="col-span-12 xl:col-span-5"
            >
              {categoryChartData.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No expenses for the selected period.
                </p>
              ) : (
                <div className="h-[19rem] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="52%"
                        outerRadius="78%"
                        paddingAngle={3}
                        stroke="transparent"
                      >
                        {categoryChartData.map((category, index) => (
                          <Cell
                            key={category.name}
                            fill={categoryColors[index % categoryColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#171b32",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 12,
                          color: "#f8fafc",
                        }}
                        formatter={(value) => formatThb(Number(value))}
                      />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        wrapperStyle={{ color: "#cbd5e1", fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
          </div>
        </section>

        {canManage && (
          <Panel title="Record Transaction" mm="ငွေသွင်း / ငွေထုတ် မှတ်တမ်း" className="col-span-12 lg:col-span-4">
            <form
              className="space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const validationError = validateTransaction(form);
                setFormError(validationError);
                if (validationError) return;
                try {
                  await actions.addTxn({ ...form, receipt: form.receipt });
                  const description = form.description;
                  setForm(emptyTxn);
                  toast.success(`Successfully added ${description}!`);
                } catch (error) {
                  toast.error(formatApiError(error, "Unable to create transaction"));
                }
              }}
            >
              {formError && <p className="text-xs text-rose">{formError}</p>}
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-medium" htmlFor="transaction-type">Transaction Type<select id="transaction-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "income" | "expense" })} className="field mt-1 w-full px-3 py-2 text-xs"><option value="income">Income</option><option value="expense">Expense</option></select></label>
                <label className="text-xs font-medium" htmlFor="transaction-date">Transaction Date<input id="transaction-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="field mt-1 w-full px-3 py-2 text-xs" required /></label>
              </div>
              <label className="block text-xs font-medium" htmlFor="transaction-category">Category<input id="transaction-category" className="field mt-1 w-full px-3 py-2 text-xs" placeholder="e.g. Sunday Offering or Supplies" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
              <label className="block text-xs font-medium" htmlFor="transaction-description">Description<input id="transaction-description" className="field mt-1 w-full px-3 py-2 text-xs" placeholder="e.g. September offering" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              <label className="block text-xs font-medium" htmlFor="transaction-amount">Amount (฿)<input id="transaction-amount" className="field mt-1 w-full px-3 py-2 text-xs" type="number" min="0.01" step="0.01" required placeholder="e.g. 50000 THB" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></label>
              <label className="block rounded-xl glass-inset p-3 text-xs cursor-pointer">
                <span className="text-muted-foreground">Upload voucher / receipt photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 block w-full text-[11px] text-muted-foreground"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
                {form.receipt && (
                  <img
                    src={form.receipt}
                    alt="Receipt preview"
                    className="mt-2 w-full aspect-4/3 rounded-lg object-cover"
                  />
                )}
              </label>
              <button className="w-full rounded-xl gradient-brand py-2.5 text-xs font-medium">
                Save Transaction
              </button>
            </form>
          </Panel>
        )}

        <Panel
          title="Transaction History"
          mm={`${rows.length} records`}
          className="col-span-12 lg:col-span-8"
          right={
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {dateFilter.month === "all" ? "All months" : "Selected month"}
              </span>
              <ExportDropdown
                title="Finance Report"
                filename="finance-report"
                headers={["Date", "Type", "Category", "Description", "Amount (THB)"]}
                rows={rows.map((transaction) => [
                  transaction.date,
                  transaction.type,
                  transaction.category,
                  transaction.description,
                  formatThb(transaction.amount),
                ])}
              />
            </div>
          }
        >
          {isLoading ? (
            <div className="space-y-3 py-2">{[1, 2, 3, 4].map((row) => <Skeleton key={row} className="h-11 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <EmptyState icon={WalletCards} description="No transactions are available for the selected period." />
          ) : <div className="overflow-x-auto"><table className="min-w-[42rem] w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground border-b border-white/10">
                <th className="text-left font-medium py-2">Date</th>
                <th className="text-left font-medium py-2">Category</th>
                <th className="text-left font-medium py-2">Description</th>
                <th className="text-right font-medium py-2">Amount</th>
                <th className="text-right font-medium py-2">Receipt</th>
                <th className="py-2" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((t) => (
                <tr key={t.id} className="hover:bg-white/5">
                  <td className="py-2.5 text-muted-foreground">{formatDate(t.date)}</td>
                  <td className="py-2.5">
                    <span className={t.type === "income" ? "text-mint" : "text-rose"}>
                      {t.type === "income" ? "Income" : "Expense"} · {t.category}
                    </span>
                  </td>
                  <td className="py-2.5">{t.description}</td>
                  <td
                    className={`py-2.5 text-right ${t.type === "income" ? "text-mint" : "text-rose"}`}
                  >
                    {t.type === "income" ? "+" : "−"}
                    {formatThb(t.amount)}
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      {t.receipt ? (
                        <button type="button" onClick={() => setViewing(t.receipt!)}>
                          <img
                            src={t.receipt}
                            alt={`Receipt for ${t.description}`}
                            loading="lazy"
                            className="h-9 w-12 rounded object-cover glass-inset"
                          />
                        </button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                      {canManage && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Edit ${t.description}`}
                          title={`Edit ${t.description}`}
                          onClick={() => {
                            setEditing(t);
                            setEditForm({
                              date: t.date,
                              type: t.type,
                              category: t.category,
                              description: t.description,
                              amount: t.amount,
                              receipt: t.receipt,
                            });
                          }}
                        >
                          <Pencil />
                          <span className="sr-only">Edit</span>
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete ${t.description}`}
                          title={`Delete ${t.description}`}
                          onClick={() => void deleteTransaction(t)}
                        >
                          <Trash2 />
                          <span className="sr-only">Delete</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                    No transactions for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table></div>}
        </Panel>
      </div>

      {viewing && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-8"
          onClick={() => setViewing(null)}
          role="presentation"
        >
          <img
            src={viewing}
            alt="Receipt full view"
            className="max-h-[80vh] rounded-2xl glass p-2 object-contain"
          />
        </div>
      )}

      <Dialog open={canManage && !!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-2"
            onSubmit={async (event) => {
              event.preventDefault();
              const validationError = validateTransaction(editForm);
              setEditError(validationError);
              if (!editing || validationError) return;
              try {
                await actions.updateTxn(editing.id, editForm);
                setEditing(null);
                const description = editForm.description;
                setEditForm(emptyTxn);
                toast.success(`Successfully updated ${description}!`);
              } catch (error) {
                toast.error(formatApiError(error, "Unable to update transaction"));
              }
            }}
          >
            {editError && <p className="text-xs text-rose">{editError}</p>}
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-medium" htmlFor="edit-transaction-type">Transaction Type<select id="edit-transaction-type" className="field mt-1 w-full px-3 py-2 text-xs" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as "income" | "expense" })}><option value="income">Income</option><option value="expense">Expense</option></select></label>
              <label className="text-xs font-medium" htmlFor="edit-transaction-date">Transaction Date<input id="edit-transaction-date" className="field mt-1 w-full px-3 py-2 text-xs" type="date" value={editForm.date} required onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} /></label>
            </div>
            <label className="block text-xs font-medium" htmlFor="edit-transaction-category">Category<input id="edit-transaction-category" className="field mt-1 w-full px-3 py-2 text-xs" placeholder="e.g. Sunday Offering or Supplies" required value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} /></label>
            <label className="block text-xs font-medium" htmlFor="edit-transaction-description">Description<input id="edit-transaction-description" className="field mt-1 w-full px-3 py-2 text-xs" placeholder="e.g. September offering" required value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></label>
            <label className="block text-xs font-medium" htmlFor="edit-transaction-amount">Amount (฿)<input id="edit-transaction-amount" className="field mt-1 w-full px-3 py-2 text-xs" type="number" min="0.01" step="0.01" required placeholder="e.g. 50000 THB" value={editForm.amount || ""} onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })} /></label>
            <label className="block rounded-xl glass-inset p-3 text-xs cursor-pointer">
              <span className="text-muted-foreground">Replace voucher / receipt photo</span>
              <input
                type="file"
                accept="image/*"
                className="mt-2 block w-full text-[11px] text-muted-foreground"
                onChange={(e) => onEditFile(e.target.files?.[0])}
              />
              {editForm.receipt && (
                <img
                  src={editForm.receipt}
                  alt="Receipt preview"
                  className="mt-2 w-full aspect-4/3 rounded-lg object-cover"
                />
              )}
            </label>
            <Button type="submit" className="w-full">
              Save changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
