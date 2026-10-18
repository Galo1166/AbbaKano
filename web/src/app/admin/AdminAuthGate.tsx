"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@admin/components/layout/Sidebar";
import TopNav from "@admin/components/layout/TopNav";
import { SidebarProvider } from "@admin/context/SidebarContext";
import { fetchAdminSession } from "@admin/services/api";
import { supabase } from "@/lib/supabase";

export default function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sessionStatus, setSessionStatus] = useState<"checking" | "authorized" | "unauthorized">("checking");

  useEffect(() => {
    if (pathname === "/admin/login") return;

    let isCancelled = false;

    fetchAdminSession()
      .then(() => {
        if (!isCancelled) {
          setSessionStatus("authorized");
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setSessionStatus("unauthorized");
          router.replace("/admin/login");
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [pathname, router]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session || session.user.app_metadata.admin_role !== "super_admin") {
          setSessionStatus("unauthorized");
          router.replace("/admin/login");
        }
      },
    );
    return () => subscription.unsubscribe();
  }, [router]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (sessionStatus === "checking") {
    return null;
  }

  if (sessionStatus !== "authorized") {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="admin-root">
        <div className="h-screen overflow-hidden bg-surface flex flex-col antialiased">
          <Sidebar />
          <div className="h-full min-h-0 flex-1 lg:pl-64 flex flex-col transition-all duration-200">
            <TopNav />
            <main id="main-content" className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pt-16 pb-6">
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
