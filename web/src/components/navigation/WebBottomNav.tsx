"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  ["home", "Home", "/app"],
  ["spark", "Buy Data", "/data"],
  ["history", "History", "/history"],
  ["profile", "Profile", "/profile"],
] as const;

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: "M3 10.5 12 3l9 7.5M5 9v11h14V9M9 20v-6h6v6",
    spark: "m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z",
    history: "M4 6h16M4 12h16M4 18h10",
    profile: "M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d={paths[name]} /></svg>;
}

export function WebBottomNav({ active, onNavigate }: { active: "home" | "data" | "history" | "profile"; onNavigate?: (tab: "home" | "data" | "history" | "profile") => void }) {
  const pathname = usePathname();
  const workspace = pathname === "/app";
  return <nav className="dashboard-bottom-nav shared-bottom-nav" aria-label="Mobile navigation">{tabs.map(([icon, label, href]) => { const isData = label === "Buy Data"; const tab = isData ? "data" : icon; const isActive = active === tab; const content = <><span className="bottom-nav-icon"><Icon name={icon} /></span><span>{label}</span></>; const navigate = () => { if (onNavigate) onNavigate(tab); else window.dispatchEvent(new CustomEvent("app-tab-change", { detail: tab })); }; return workspace || onNavigate ? <button className={`${isActive ? "active " : ""}${isData ? "data-tab" : ""}`} type="button" onClick={navigate} key={label}>{content}</button> : <Link className={`${isActive ? "active " : ""}${isData ? "data-tab" : ""}`} href={href} key={label}>{content}</Link>; })}</nav>;
}
