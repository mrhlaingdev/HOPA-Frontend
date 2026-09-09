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

export const Route = createFileRoute("/teachers")({
  head: () => ({ meta: [{ title: "Teachers Directory — House Of Prayer Assembly" }] }),
  component: TeachersPage,
});

const emptyForm = { name: "", phone: "", email: "", specialization: "", active: true };
type TeacherForm = typeof emptyForm;

function TeachersPage() {
  const { teachers, isLoading } = useChurch();
  const canManage = usePermission("manage-teachers");
  const canDelete = usePermission("delete-records");
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<(typeof teachers)[number] | null>(null);
  const [form, setForm] = useState<TeacherForm>(emptyForm);
  const [error, setError] = useState("");

  const rows = useMemo(
    () =>
      teachers.filter((teacher) =>
        [teacher.name, teacher.email, teacher.phone, teacher.specialization].some((value) =>
          value.toLowerCase().includes(q.toLowerCase()),
        ),
      ),
    [teachers, q],
  );

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setDialogOpen(true);
  }

  function openEdit(teacher: (typeof teachers)[number]) {
    setEditing(teacher);
    setForm({
      name: teacher.name,
      phone: teacher.phone,
      email: teacher.email,
      specialization: teacher.specialization,
      active: teacher.active ?? true,
    });
    setError("");
    setDialogOpen(true);
  }

  function validate() {
    if (!form.name.trim()) return "Teacher name is required.";
    if (!form.phone.trim()) return "Phone number is required.";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return "Enter a valid email address.";
    return "";
  }

  async function save() {
    const validationError = validate();
    setError(validationError);
    if (validationError) return;
    try {
      if (editing) await actions.updateTeacher(editing.id, form);
      else await actions.addTeacher(form);
      setDialogOpen(false);
      toast.success(`Successfully ${editing ? "updated" : "added"} ${form.name}!`);
    } catch (requestError) {
      toast.error(formatApiError(requestError, "Unable to save teacher"));
    }
  }

  function exportTeachers() {
    downloadCsv(
      "teacher-directory.csv",
      ["Name", "Phone", "Email", "specialization", "Status"],
      rows.map((teacher) => [
        teacher.name,
        teacher.phone,
        teacher.email,
        teacher.specialization,
        teacher.active === false ? "Inactive" : "Active",
      ]),
    );
  }

  return (
    <AppShell search={q} onSearch={setQ}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Teachers Directory</h1>
          <p className="text-[11px] text-muted-foreground">ဆရာများ စီမံခန့်ခွဲမှု</p>
        </div>
      </div>
      <Panel
        title="Teachers"
        mm={`${rows.length} of ${teachers.length} teachers`}
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportTeachers}
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
                <Plus className="size-3.5" /> Add Teacher
              </button>
            )}
          </div>
        }
      >
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          className="field mb-3 w-full max-w-sm px-3 py-2 text-xs"
          placeholder="Search teachers"
          aria-label="Search teachers"
        />
        {isLoading ? (
          <p className="py-8 text-center text-xs text-muted-foreground">Loading teachers…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            description="Add a teacher or adjust your search to see records here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[42rem] w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="py-2">Name</th>
                  <th className="py-2">specialization</th>
                  <th className="py-2">Phone</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Status</th>
                  <th className="py-2" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((teacher) => (
                  <tr key={teacher.id}>
                    <td className="py-2.5 font-medium">{teacher.name}</td>
                    <td className="py-2.5 text-muted-foreground">{teacher.specialization || "—"}</td>
                    <td className="py-2.5 text-muted-foreground">{teacher.phone}</td>
                    <td className="py-2.5 text-muted-foreground">{teacher.email || "—"}</td>
                    <td className="py-2.5 text-xs text-mint">
                      {teacher.active === false ? "Inactive" : "Active"}
                    </td>
                    <td className="py-2.5 text-right">
                      {canManage && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(teacher)}
                          aria-label={`Edit ${teacher.name}`}
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
                            if (!window.confirm(`Delete ${teacher.name}?`)) return;
                            try {
                              await actions.deleteTeacher(teacher.id);
                              toast.success("Successfully deleted record!");
                            } catch (requestError) {
                              toast.error(formatApiError(requestError, "Unable to delete teacher"));
                            }
                          }}
                          aria-label={`Delete ${teacher.name}`}
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
            <DialogTitle>{editing ? "Edit Teacher" : "Add Teacher"}</DialogTitle>
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
            <label className="col-span-2 text-xs font-medium">
              specialization
              <input
                className="field mt-1 w-full px-3 py-2 text-xs"
                placeholder="e.g. Bible Studies"
                value={form.specialization}
                onChange={(event) => setForm({ ...form, specialization: event.target.value })}
              />
            </label>
            <label className="col-span-2 flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
              />{" "}
              Active teacher
            </label>
            <Button type="submit" className="col-span-2">
              {editing ? "Save changes" : "Add Teacher"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
