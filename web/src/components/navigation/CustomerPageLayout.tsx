import { WebBottomNav } from "@/components/navigation/WebBottomNav";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";
import { DashboardBackButton } from "@/components/navigation/DashboardBackButton";

export function CustomerPageLayout({
  active,
  eyebrow,
  title,
  subtitle,
  children,
  className = "profile-page",
  headerClassName = "profile-header",
}: {
  active: "home" | "data" | "history" | "profile";
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}) {
  return (
    <main className={className}>
      <WebDesktopSidebar active={active} />
      <div className="customer-page-body">
        <header className={headerClassName}>
          <DashboardBackButton />
          <p className="data-kicker">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </header>
        {children}
      </div>
      <WebBottomNav active={active} />
    </main>
  );
}
