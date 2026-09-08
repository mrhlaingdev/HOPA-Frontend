import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, Panel } from "@/components/AppShell";
import { CURRENT_MONTH, actions, monthOf, monthlyTotals, useChurch } from "@/lib/church-store";
import { formatDate, formatKs, formatShort } from "@/lib/church-data";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "Petty Cash & Finance — House Of Prayer Assembly Sunday School OS" },
      {
        name: "description",
        content:
          "Record church offerings and expenses, attach voucher or receipt photos, and review the monthly income, expense and net balance report.",
      },
      { property: "og:title", content: "Petty Cash & Finance — House Of Prayer Assembly Sunday School OS" },
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
  const { txns } = useChurch();
  const [q, setQ] = useState("");
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [form, setForm] = useState(emptyTxn);
  const [viewing, setViewing] = useState<string | null>(null);

  const months = useMemo(
    () => Array.from(new Set(txns.map((t) => monthOf(t.date)))).sort().reverse(),
    [txns],
  );
  const totals = monthlyTotals(txns, month);
  const rows = totals.rows.filter(
    (t) =>
      t.description.toLowerCase().includes(q.toLowerCase()) ||
      t.category.toLowerCase().includes(q.toLowerCase()),
  );

  function onFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, receipt: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  return (
    <AppShell search={q} onSearch={setQ}>
      <h1 className="font-display text-2xl font-semibold">Petty Cash &amp; Finance</h1>
      <p className="text-[11px] text-muted-foreground mb-4">ငွေစာရင်း စီမံခန့်ခွဲမှု</p>

      <div className="grid grid-cols-12 gap-4">
        <div className="glass rounded-2xl col-span-4 p-5">
          <p className="text-muted-foreground text-sm">Total Income</p>
          <p className="mt-1 text-3xl font-display font-bold text-mint">
            {formatShort(totals.income)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{formatKs(totals.income)}</p>
        </div>
        <div className="glass rounded-2xl col-span-4 p-5">
          <p className="text-muted-foreground text-sm">Total Expenses</p>
          <p className="mt-1 text-3xl font-display font-bold text-rose">
            {formatShort(totals.expense)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{formatKs(totals.expense)}</p>
        </div>
        <div className="glass rounded-2xl col-span-4 p-5">
          <p className="text-muted-foreground text-sm">Net Balance · လက်ကျန်</p>
          <p className="mt-1 text-3xl font-display font-bold">
            {totals.net >= 0 ? "+ " : "− "}
            {formatShort(Math.abs(totals.net))}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Month {month}</p>
        </div>

        <Panel title="Record Transaction" mm="ငွေသွင်း / ငွေထုတ် မှတ်တမ်း" className="col-span-4">
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.description.trim() || !form.amount) return;
              actions.addTxn({ ...form, receipt: form.receipt });
              setMonth(monthOf(form.date));
              setForm(emptyTxn);
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as "income" | "expense" })
                }
                className="field px-3 py-2 text-xs"
                aria-label="Transaction type"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="field px-3 py-2 text-xs"
                aria-label="Date"
              />
            </div>
            <input
              className="field w-full px-3 py-2 text-xs"
              placeholder="Category (e.g. Donation, Supplies)"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <input
              className="field w-full px-3 py-2 text-xs"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <input
              className="field w-full px-3 py-2 text-xs"
              type="number"
              placeholder="Amount (Ks)"
              value={form.amount || ""}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            />
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

        <Panel
          title="Transaction History"
          mm={`${rows.length} records`}
          className="col-span-8"
          right={
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="field px-3 py-2 text-xs"
              aria-label="Select month"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          }
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground border-b border-white/10">
                <th className="text-left font-medium py-2">Date</th>
                <th className="text-left font-medium py-2">Category</th>
                <th className="text-left font-medium py-2">Description</th>
                <th className="text-right font-medium py-2">Amount</th>
                <th className="text-right font-medium py-2">Receipt</th>
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
                    {t.amount.toLocaleString("en-US")}
                  </td>
                  <td className="py-2.5">
                    <div className="flex justify-end">
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
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                    No transactions for this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
    </AppShell>
  );
}
