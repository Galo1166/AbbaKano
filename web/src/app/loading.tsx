import { DashboardLoadingSkeleton } from "@/components/dashboard/DashboardShell";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Dashboard" role="presentation">
      <DashboardLoadingSkeleton />
    </div>
  );
}
