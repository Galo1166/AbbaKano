"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

const tabs = [
  ["home", "Home", "/app"],
  ["data", "Buy Data", "/data"],
  ["history", "History", "/history"],
  ["profile", "Profile", "/profile"],
] as const;

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: "M3 10.5 12 3l9 7.5M5 9v11h14V9M9 20v-6h6v6",
    spark: "m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z",
    history: "M4 6h16M4 12h16M4 18h10",
    profile: "M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    wallet: "M3 7h18v13H3zM3 7l2-4h14l2 4M16 13h5",
    logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d={paths[name]} /></svg>;
}

export function WebDesktopSidebar({
  active,
  onNavigate,
  onLogout,
}: {
  active?: "home" | "data" | "history" | "profile";
  onNavigate?: (tab: "home" | "data" | "history" | "profile") => void;
  onLogout?: () => void;
}) {
  const router = useRouter();

  const handleNavigate = (event: React.MouseEvent<HTMLAnchorElement>, href: string, tab: "home" | "data" | "history" | "profile") => {
    if (onNavigate) {
      event.preventDefault();
      onNavigate(tab);
      return;
    }
    event.preventDefault();
    router.push(href);
  };

  const handleFundWallet = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (typeof window !== "undefined" && window.location.pathname === "/app") {
      window.dispatchEvent(new CustomEvent("app-tab-change", { detail: "funding" }));
      return;
    }
    router.push("/fund-wallet");
  };

  return <aside className="web-desktop-sidebar"><Link className="web-sidebar-brand" href="/app"><span><Image src="/branding/logo.png" alt="AbbaKano" width={38} height={38} /></span><strong>ABBAKANO<small>DATA SUB</small></strong></Link><nav aria-label="Desktop navigation">{tabs.map(([icon, label, href]) => {
    const tab = icon === "data" ? "data" : icon;
    return <Link className={active === icon ? "active" : ""} href={href} key={label} onClick={(event) => handleNavigate(event, href, tab)}><Icon name={icon === "data" ? "spark" : icon} /><span>{label}</span></Link>;
  })}</nav><div className="web-sidebar-secondary"><Link className="web-sidebar-fund" href="/fund-wallet" onClick={handleFundWallet}><Icon name="wallet" /><span>Fund Wallet</span></Link><Link href="/support" onClick={(event) => { event.preventDefault(); router.push("/support"); }}><span className="web-sidebar-dot" />Support</Link>{onLogout && <button type="button" className="web-sidebar-logout" onClick={onLogout}><Icon name="logout" /><span>Log Out</span></button>}</div></aside>;
}
