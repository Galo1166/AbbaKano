import { DashboardShell } from "@/components/dashboard/DashboardShell";
import AppAuthGate from "./AppAuthGate";

export default function AppPage() {
  return (
    <AppAuthGate>
      <DashboardShell />
    </AppAuthGate>
  );
}
