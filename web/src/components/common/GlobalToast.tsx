"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; message: string; type: "error" | "success" };
type ToastEventDetail = { type: "error" | "success"; message: string };

export function GlobalToast() {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    let nextId = 0;
    let timeout: number | undefined;

    function handleToast(event: Event) {
      const detail = (event as CustomEvent<ToastEventDetail>).detail;
      if (!detail || (detail.type !== "error" && detail.type !== "success")) return;

      const id = ++nextId;
      setToast({ id, message: detail.message, type: detail.type });
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        setToast((current) => current?.id === id ? null : current);
      }, 5000);
    }

    window.addEventListener("abbakano:toast", handleToast);
    return () => {
      window.removeEventListener("abbakano:toast", handleToast);
      window.clearTimeout(timeout);
    };
  }, []);

  if (!toast) return null;
  return (
    <div className={`global-toast global-toast-${toast.type}`} role={toast.type === "error" ? "alert" : "status"} aria-live={toast.type === "error" ? "assertive" : "polite"}>
      <span className="global-toast-icon" aria-hidden="true">{toast.type === "error" ? "!" : "✓"}</span>
      <span>{toast.message}</span>
      <button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification">×</button>
    </div>
  );
}
