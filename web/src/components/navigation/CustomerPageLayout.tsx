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
  hideDashboardNavigation = false,
}: {
  active: "home" | "data" | "history" | "profile";
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  hideDashboardNavigation?: boolean;
}) {
  return (
    <main className={`${className}${hideDashboardNavigation ? " public-info-page" : ""}`}>
      {!hideDashboardNavigation && <WebDesktopSidebar active={active} />}
      <div className="customer-page-body">
        <header className={headerClassName}>
          {!hideDashboardNavigation && <DashboardBackButton />}
          <p className="data-kicker">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </header>
        {children}
      </div>
      {!hideDashboardNavigation && <WebBottomNav active={active} />}
    </main>
  );
}
