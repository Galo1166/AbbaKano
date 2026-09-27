"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@admin/components/layout/Sidebar";
import TopNav from "@admin/components/layout/TopNav";
import { SidebarProvider } from "@admin/context/SidebarContext";
import { fetchAdminSession } from "@admin/services/api";

export default function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(pathname !== "/admin/login");
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setChecking(false);
      setAuthorized(false);
      return;
    }

    let isCancelled = false;
    setChecking(true);

    fetchAdminSession()
      .then(() => {
        if (!isCancelled) {
          setAuthorized(true);
          setChecking(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setAuthorized(false);
          setChecking(false);
          router.replace("/admin/login");
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [pathname, router]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (checking) {
    return null;
  }

  if (!authorized) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="admin-root">
        <div className="min-h-screen bg-surface flex flex-col antialiased">
          <Sidebar />
          <div className="flex-1 lg:pl-64 flex flex-col min-h-screen transition-all duration-200">
            <TopNav />
            <main className="flex-1 pt-16 pb-12">
              <div className="w-full px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
