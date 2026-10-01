"use client";

import { useEffect } from "react";

export function BackendWarmup() {
  useEffect(() => {
    function pingBackend() {
      // 1. Ping via internal Next.js proxy route
      fetch("/api/auth/health", { cache: "no-store" }).catch(() => {});

      // 2. Direct ping to Render backend if in production or configured
      if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
        fetch("https://abbakano-1.onrender.com/health", { mode: "no-cors", cache: "no-store" }).catch(() => {});
      }
    }

    // Ping immediately upon landing on the website
    pingBackend();

    // Keep backend alive while user remains on the website (every 10 minutes)
    const interval = window.setInterval(pingBackend, 10 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  return null;
}
