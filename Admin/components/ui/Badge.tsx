import { cn } from "@/lib/utils";

type BadgeVariant =
  | "success"
  | "pending"
  | "failed"
  | "refunded"
  | "warning"
  | "info"
  | "neutral"
  | "critical";

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
  pending: "bg-amber-50 text-amber-700 border border-amber-200/80",
  failed: "bg-rose-50 text-rose-700 border border-rose-200/80",
  refunded: "bg-slate-100 text-slate-700 border border-slate-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200/80",
  info: "bg-blue-50 text-blue-700 border border-blue-200/80",
  neutral: "bg-slate-100 text-slate-700 border border-slate-200",
  critical: "bg-rose-50 text-rose-700 border border-rose-200/80",
};

const variantDot: Record<BadgeVariant, string> = {
  success: "bg-emerald-500",
  pending: "bg-amber-500",
  failed: "bg-rose-500",
  refunded: "bg-slate-400",
  warning: "bg-amber-500",
  info: "bg-blue-500",
  neutral: "bg-slate-400",
  critical: "bg-rose-500",
};

interface BadgeProps {
  variant: BadgeVariant;
  label: string;
  withDot?: boolean;
  className?: string;
}

export default function Badge({ variant, label, withDot, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 select-none",
        variantClasses[variant],
        className
      )}
    >
      {withDot && (
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", variantDot[variant])} />
      )}
      <span>{label}</span>
    </span>
  );
}

// Status-to-variant mapping helpers
export function txStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    SUCCESS: "success",
    PENDING: "pending",
    FAILED: "failed",
    REFUNDED: "refunded",
  };
  return map[status] ?? "neutral";
}

export function inflowStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    SETTLED: "success",
    PENDING_SETTLEMENT: "pending",
    UNMATCHED: "warning",
    MANUAL_RESOLVED: "info",
  };
  return map[status] ?? "neutral";
}

export function providerStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    HEALTHY: "success",
    LOW_BALANCE: "warning",
    CRITICAL: "critical",
    OFFLINE: "failed",
  };
  return map[status] ?? "neutral";
}
