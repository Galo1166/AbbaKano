"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import { DataPurchaseShell } from "@/components/data/DataPurchaseShell";
import { AirtimeShell } from "@/components/airtime/AirtimeShell";
import { HistoryShell } from "@/components/history/HistoryShell";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { CableTVShell } from "@/components/cable/CableTVShell";
import { ElectricityShell } from "@/components/electricity/ElectricityShell";
import { FundWalletShell } from "@/components/funding/FundWalletShell";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";
import { ReferEarnShell } from "@/components/referral/ReferEarnShell";
import { useThemeMode } from "@/lib/theme";

type DashboardData = {
    user: { full_name?: string; fullName?: string; email?: string; phone?: string; biometrics_enabled?: boolean; app_lock_enabled?: boolean; has_transaction_pin?: boolean; has_passkey?: boolean; referralCount?: number; referralEarnings?: number; referralCommissionBalance?: number };
    balance: number;
    transactions: Array<{ id?: string | number; type?: string; label?: string; status?: string; amount?: number; date?: string }>;
};

const navigation = [
    ["home", "Home"],
    ["spark", "Buy Data"],
    ["history", "History"],
    ["profile", "Profile"],
];

const services = [
    ["data", "Data Bundles", "SME, Gifting & Corp", "/data", "2% OFF"],
    ["airtime", "Airtime Topup", "Instant Topup", "/airtime", "HOT"],
    ["power", "Electricity", "AEDC/IKEDC", "/electricity", "Instant"],
    ["tv", "Cable TV", "DSTV, GOTV & Star", "/cable-tv", "Instant"],
];

function Icon({ name }: { name: string }) {
    const paths: Record<string, string> = {
        home: "M3 10.5 12 3l9 7.5M5 9v11h14V9M9 20v-6h6v6",
        data: "M4 7h16M4 12h16M4 17h10",
        history: "M4 6h16M4 12h16M4 18h10",
        profile: "M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
        airtime: "M12 3v18M5 8.5a10 10 0 0 1 14 0M8 12a6 6 0 0 1 8 0",
        power: "m13 2-8 12h6l-1 8 8-12h-6l1-8Z",
        spark: "m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z",
        tv: "M3 6h18v13H3zM8 3l4 3 4-3M10 10l5 3-5 3v-6Z",
        wallet: "M3 7h18v13H3zM3 7l2-4h14l2 4M16 13h5",
        support: "M4 13a8 8 0 0 1 16 0v4M4 13v4a2 2 0 0 0 2 2h2v-6H4m16 0h-4v6h2a2 2 0 0 0 2-2",
        eye: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
    };
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d={paths[name] || paths.home} /></svg>;
}

function formatNaira(amount: number) {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2 }).format(amount || 0);
}

function ThemeIcon({ light }: { light: boolean }) {
    return light
        ? <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
        : <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20.5 14.7A8.5 8.5 0 0 1 9.3 3.5 8.5 8.5 0 1 0 20.5 14.7Z" /></svg>;
}

function transactionLabel(transaction: DashboardData["transactions"][number]) {
    return transaction.label || transaction.type?.replaceAll("_", " ") || "Wallet transaction";
}

export function DashboardShell() {
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [hiddenBalance, setHiddenBalance] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);
    const { theme, toggleTheme } = useThemeMode();
    const [activeTab, setActiveTab] = useState("home");
    const lightMode = theme === "light";

    async function handleLogout() {
        try {
            await apiRequest("/logout", { method: "POST" });
        } catch (error) {
            console.error("Could not log out of the dashboard", error);
        }
        router.push("/login");
    }

    useEffect(() => {
        let cancelled = false;

        async function hydrateDashboard() {
            try {
                const [me, wallet, transactionResponse] = await Promise.all([
                    apiRequest<{ user: DashboardData["user"] }>("/me"),
                    apiRequest<{ balance: number }>("/wallet"),
                    apiRequest<{ transactions: DashboardData["transactions"] }>("/transactions"),
                ]);
                if (!cancelled) setData({ user: me.user, balance: wallet.balance, transactions: transactionResponse.transactions || [] });
            } catch (error) {
                if (cancelled) return;
                if (error instanceof ApiError && error.status === 401) {
                    router.push("/login");
                    return;
                }
                setErrorMessage(error instanceof ApiError ? error.message : "Could not load your wallet.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void hydrateDashboard();
        return () => { cancelled = true; };
    }, [reloadKey, router]);

    useEffect(() => {
        function handleTabChange(event: Event) {
            const tab = (event as CustomEvent<string>).detail;
            if (tab === "data") setActiveTab("bolt");
            else if (tab === "electricity") setActiveTab("power");
            else if (tab === "cable-tv") setActiveTab("tv");
            else if (tab === "fund-wallet") setActiveTab("funding");
            else setActiveTab(tab);
        }
        window.addEventListener("app-tab-change", handleTabChange);
        return () => window.removeEventListener("app-tab-change", handleTabChange);
    }, []);

    useEffect(() => {
        function refreshDashboard() {
            setReloadKey((current) => current + 1);
        }
        window.addEventListener("dashboard-refresh", refreshDashboard);
        return () => window.removeEventListener("dashboard-refresh", refreshDashboard);
    }, []);

    const firstName = data?.user.full_name?.split(" ")[0] || data?.user.fullName?.split(" ")[0] || "there";

    if (loading) {
        return <main className="dashboard-state"><div className="dashboard-spinner" /><p>Loading your wallet...</p></main>;
    }

    if (errorMessage || !data) {
        return <main className="dashboard-state"><div className="dashboard-state-icon"><Icon name="wallet" /></div><h1>We could not load your wallet</h1><p>{errorMessage || "Your session data is not available yet."}</p><button className="dashboard-primary" type="button" onClick={() => { setLoading(true); setErrorMessage(""); setReloadKey((current) => current + 1); }}>Try again</button></main>;
    }

    if (activeTab === "bolt") return <DataPurchaseShell />;
    if (activeTab === "airtime") return <AirtimeShell />;
    if (activeTab === "power" || activeTab === "electricity") return <ElectricityShell />;
    if (activeTab === "tv" || activeTab === "cable-tv") return <CableTVShell />;
    if (activeTab === "funding" || activeTab === "fund-wallet") return <FundWalletShell />;
    if (activeTab === "history") return <HistoryShell initialTransactions={data.transactions} />;
    if (activeTab === "profile") return <ProfileShell initialUser={data.user} />;
    if (activeTab === "referral") return <ReferEarnShell initialUser={data.user} />;

    return (
        <main className={`dashboard-shell${lightMode ? " light" : ""}`}>
            <WebDesktopSidebar active="home" onNavigate={(tab) => setActiveTab(tab === "data" ? "bolt" : tab)} onLogout={handleLogout} />
            <section className="dashboard-main" id="main-content">
                <header className="dashboard-header"><Link className="dashboard-mobile-brand" href="/app"><span className="dashboard-logo"><Image src="/branding/logo.png" alt="AbbaKano" width={34} height={34} /></span><span>ABBAKANO<small>DATA SUB</small></span></Link><div><p className="dashboard-kicker">Wallet overview</p><h1>{activeTab === "home" ? `Welcome back, ${firstName}` : navigation.find(([icon]) => icon === activeTab)?.[1]}</h1><p>{activeTab === "home" ? "Manage your wallet and pay every bill from one place." : "Your dashboard tabs stay in place while each section loads."}</p></div>
                <div className="dashboard-header-actions"><button className="dashboard-icon-button" type="button" onClick={toggleTheme} aria-label={`Switch to ${lightMode ? "dark" : "light"} mode`}><ThemeIcon light={lightMode} /></button><Link href="/support" className="dashboard-icon-button" aria-label="Contact Support"><Icon name="support" /></Link><button className="dashboard-avatar" type="button" onClick={() => setActiveTab("profile")} aria-label="Open profile">{firstName.slice(0, 1).toUpperCase()}</button></div></header>

                <div className="dashboard-content">
                    <section className="balance-card"><div className="balance-card-top"><div><span className="balance-label">Wallet Balance</span><span className="balance-status"><i />Instant Active</span></div><button className="balance-visibility" type="button" onClick={() => setHiddenBalance((current) => !current)} aria-label={hiddenBalance ? "Show wallet balance" : "Hide wallet balance"}><Icon name="eye" /></button></div><strong className="balance-value">{hiddenBalance ? "••••••••" : formatNaira(data.balance)}</strong><div className="balance-actions"><button type="button" onClick={() => setActiveTab("funding")} className="dashboard-primary"><Icon name="wallet" />Fund Wallet</button><button type="button" onClick={() => setActiveTab("bolt")} className="balance-link">Instant Sub</button></div></section>

                    <section className="dashboard-section"><div className="dashboard-section-heading"><div><span className="dashboard-kicker">Services</span><h2>VTU Hub</h2></div><button className="dashboard-section-link" type="button" onClick={() => setActiveTab("bolt")}>View all</button></div><div className="service-grid">{services.map(([icon, title, description, href, badge]) => <button className="dashboard-service" type="button" onClick={() => { if (title === "Data Bundles") setActiveTab("bolt"); else if (title === "Airtime Topup") setActiveTab("airtime"); else if (title === "Electricity") setActiveTab("power"); else if (title === "Cable TV") setActiveTab("tv"); else router.push(href); }} key={title}><span className={`service-icon ${icon}`}><Icon name={icon} /></span><span className="service-copy"><strong>{title}</strong><small>{description}</small></span><span className="service-badge">{badge}</span></button>)}</div></section>

                    <section className="support-card"><div className="support-card-icon"><Icon name="support" /></div><div><span className="dashboard-kicker">Need a hand?</span><h2>24/7 Resolution Desk</h2><p>WhatsApp, Phone Calls &amp; Email Support</p></div><Link href="/support" className="support-link">Help <span aria-hidden="true">-&gt;</span></Link></section>

                    <section className="dashboard-section transactions-section"><div className="dashboard-section-heading"><div><span className="dashboard-kicker">Activity</span><h2>Recent Transactions</h2></div><button className="dashboard-section-link" type="button" onClick={() => setActiveTab("history")}>View All ({data.transactions.length})</button></div>{data.transactions.length === 0 ? <div className="transactions-empty"><Icon name="history" /><p>No transactions yet</p><span>Your completed wallet activity will appear here.</span></div> : <div className="transaction-list">{data.transactions.slice(0, 5).map((transaction, index) => <div className="transaction-row" key={transaction.id || `${transaction.date}-${index}`}><span className="transaction-icon"><Icon name={transaction.type?.toLowerCase() === "airtime" ? "airtime" : transaction.type?.toLowerCase() === "data" ? "data" : "wallet"} /></span><span className="transaction-copy"><strong>{transactionLabel(transaction)}</strong><small>{transaction.date || "Recent activity"}</small></span><span className={`transaction-amount ${transaction.status?.toLowerCase() === "failed" ? "failed" : ""}`}>{formatNaira(Number(transaction.amount) || 0)}</span></div>)}</div>}</section>
                </div>
            </section>

            <WebBottomNav active={activeTab === "bolt" ? "data" : activeTab as "home" | "data" | "history" | "profile"} />
        </main>
    );
}
