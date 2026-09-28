"use client";

import { useRouter } from "next/navigation";

export function DashboardBackButton() {
  const router = useRouter();

  function goToDashboard() {
    if (window.location.pathname === "/app") {
      window.dispatchEvent(new CustomEvent("app-tab-change", { detail: "home" }));
      return;
    }
    router.push("/app");
  }

  return (
    <button className="dashboard-back-button" type="button" onClick={goToDashboard}>
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
      <span>Back to Dashboard</span>
    </button>
  );
}