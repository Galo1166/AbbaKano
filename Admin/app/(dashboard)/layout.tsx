import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import { SidebarProvider } from "@/context/SidebarContext";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Console | AbbaKano Admin Portal",
  description: "AbbaKano Core telecom and reseller operations management platform.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
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
    </SidebarProvider>
  );
}
