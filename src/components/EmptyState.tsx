import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title = "No Data Available",
  description = "There is nothing to show here yet.",
}: {
  icon: LucideIcon;
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-4 py-10 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/20">
        <Icon className="size-6" strokeWidth={1.6} aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  );
}