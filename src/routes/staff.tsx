import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { actions, formatApiError, useChurch } from "@/lib/church-store";
import { downloadCsv } from "@/lib/utils";
import { usePermission } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/staff")({
  head: () => ({ meta: [{ title: "Staff Directory — House Of Prayer Assembly" }] }),
  component: StaffPage,
});

const emptyForm = { name: "", position: "", phone: "", email: "", salary: 0, active: true };
type StaffForm = typeof emptyForm;

function StaffPage() {
  const { staff, isLoading } = useChurch();
  const canManage = usePermission("manage-staff");
  const canDelete = usePermission("delete-records");
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<(typeof staff)[number] | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [error, setError] = useState("");

  const rows = useMemo(
    () =>
      staff.filter((member) =>
        [member.name, member.position, member.email, member.phone].some((value) =>
          value.toLowerCase().includes(q.toLowerCase()),
        ),
      ),
    [staff, q],
  );

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setDialogOpen(true);
  }
  function openEdit(member: (typeof staff)[number]) {
    setEditing(member);
    setForm({
      name: member.name,
      position: member.position,
      phone: member.phone,
      email: member.email,
      salary: member.salary,
      active: member.active ?? true,
    });
    setError("");
    setDialogOpen(true);
  }
  function validate() {
    if (!form.name.trim()) return "Staff name is required.";
    if (!form.position.trim()) return "Position is required.";
    if (!form.phone.trim()) return "Phone number is required.";
    if (!Number.isFinite(form.salary) || form.salary < 0) return "Salary must be zero or greater.";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return "Enter a valid email address.";
    return "";
  }
  async function save() {
    const validationError = validate();
    setError(validationError);
    if (validationError) return;
    try {
      if (editing) await actions.updateStaff(editing.id, form);
      else await actions.addStaff(form);
      setDialogOpen(false);
      toast.success(`Successfully ${editing ? "updated" : "added"} ${form.name}!`);
    } catch (requestError) {
      toast.error(formatApiError(requestError, "Unable to save staff member"));
    }
  }
  function exportStaff() {
    downloadCsv(
      "staff-directory.csv",
      ["Name", "Position", "Phone", "Email", "Salary", "Status"],
      rows.map((member) => [
        member.name,
        member.position,
        member.phone,
        member.email,
        member.salary,
        member.active === false ? "Inactive" : "Active",
      ]),
    );
  }

  return (
    <AppShell search={q} onSearch={setQ}>
      <div className="mb-4">
        <h1 className="font-display text-2xl font-semibold">Staff Directory</h1>
        <p className="text-[11px] text-muted-foreground">ဝန်ထမ်းများ စီမံခန့်ခွဲမှု</p>
      </div>
      <Panel
        title="Staff"
        mm={`${rows.length} of ${staff.length} staff members`}
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportStaff}
              className="glass flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium"
            >
              <Download className="size-3.5" /> Export CSV
            </button>
            {canManage && (
              <button
                type="button"
                onClick={openAdd}
                className="gradient-mint flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-accent-foreground"
              >
                <Plus className="size-3.5" /> Add Staff
              </button>
            )}
          </div>
        }
      >
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          className="field mb-3 w-full max-w-sm px-3 py-2 text-xs"
          placeholder="Search staff"
          aria-label="Search staff"
        />
        {isLoading ? (
          <p className="py-8 text-center text-xs text-muted-foreground">Loading staff…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            description="Add a staff member or adjust your search to see records here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[44rem] w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="py-2">Name</th>
                  <th className="py-2">Position</th>
                  <th className="py-2">Phone</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Salary</th>
                  <th className="py-2">Status</th>
                  <th className="py-2" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((member) => (
                  <tr key={member.id}>
                    <td className="py-2.5 font-medium">{member.name}</td>
                    <td className="py-2.5 text-muted-foreground">{member.position}</td>
                    <td className="py-2.5 text-muted-foreground">{member.phone}</td>
                    <td className="py-2.5 text-muted-foreground">{member.email || "—"}</td>
                    <td className="py-2.5 text-mint">{member.salary.toLocaleString()}</td>
                    <td className="py-2.5 text-xs text-mint">
                      {member.active === false ? "Inactive" : "Active"}
                    </td>
                    <td className="py-2.5 text-right">
                      {canManage && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(member)}
                          aria-label={`Edit ${member.name}`}
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
                          onClick={async () => {
                            if (!window.confirm(`Delete ${member.name}?`)) return;
                            try {
                              await actions.deleteStaff(member.id);
                              toast.success("Successfully deleted record!");
                            } catch (requestError) {
                              toast.error(
                                formatApiError(requestError, "Unable to delete staff member"),
                              );
                            }
                          }}
                          aria-label={`Delete ${member.name}`}
                        >
                          <Trash2 />
                          <span className="sr-only">Delete</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid grid-cols-2 gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            {error && <p className="col-span-2 text-xs text-rose">{error}</p>}
            <label className="col-span-2 text-xs font-medium">
              Name
              <input
                className="field mt-1 w-full px-3 py-2 text-xs"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <label className="text-xs font-medium">
              Position
              <input
                className="field mt-1 w-full px-3 py-2 text-xs"
                value={form.position}
                onChange={(event) => setForm({ ...form, position: event.target.value })}
              />
            </label>
            <label className="text-xs font-medium">
              Salary
              <input
                className="field mt-1 w-full px-3 py-2 text-xs"
                type="number"
                min="0"
                step="0.01"
                value={form.salary}
                onChange={(event) => setForm({ ...form, salary: Number(event.target.value) })}
              />
            </label>
            <label className="text-xs font-medium">
              Phone
              <input
                className="field mt-1 w-full px-3 py-2 text-xs"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </label>
            <label className="text-xs font-medium">
              Email
              <input
                className="field mt-1 w-full px-3 py-2 text-xs"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
            <label className="col-span-2 flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
              />{" "}
              Active staff member
            </label>
            <Button type="submit" className="col-span-2">
              {editing ? "Save changes" : "Add Staff"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
