"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, ApiError } from "@/lib/api";

export default function AppAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let isActive = true;

    setChecking(true);

    apiRequest<{ user?: unknown }>('/me')
      .then(() => {
        if (!isActive) return;
        setAuthorized(true);
        setChecking(false);
      })
      .catch((error) => {
        if (!isActive) return;
        if (error instanceof ApiError && error.status === 401) {
          router.replace('/login');
          return;
        }
        router.replace('/login');
      })
      .finally(() => {
        if (!isActive) return;
        setChecking(false);
      });

    return () => {
      isActive = false;
    };
  }, [router]);

  if (checking) {
    return null;
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
