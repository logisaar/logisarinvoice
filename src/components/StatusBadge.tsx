import { cn } from "@/lib/utils";

type Status = "paid" | "pending" | "failed";

const styles: Record<Status, string> = {
  paid: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  failed: "bg-destructive/10 text-destructive",
};

const labels: Record<Status, string> = {
  paid: "Paid",
  pending: "Pending",
  failed: "Failed",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        styles[status]
      )}
    >
      {labels[status]}
    </span>
  );
}
