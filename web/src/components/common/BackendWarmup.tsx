"use client";

import { useEffect } from "react";

export function BackendWarmup() {
  useEffect(() => {
    function pingBackend() {
      // Keep the production backend warm without routing through the local proxy.
      if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
        fetch("https://abbakano.onrender.com/health", { mode: "no-cors", cache: "no-store" }).catch(() => {});
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
