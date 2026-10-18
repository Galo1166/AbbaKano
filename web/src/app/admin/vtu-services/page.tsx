"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import { fetchAdminTransactions, fetchAdminVtuServices, manageAdminVtuPlans, managePriceOverrides, manageCablePriceOverrides } from "@admin/services/api";
import { formatNaira, formatTimeAgo } from "@admin/lib/utils";
import Badge, { txStatusVariant } from "@admin/components/ui/Badge";
import PageHeader from "@admin/components/layout/PageHeader";
import type { Transaction } from "@admin/types/telecom";
import type { AdminVtuPlan, CablePriceOverride, ProviderLivePlan, PriceOverride } from "@admin/services/api";
import Toggle from "@admin/components/ui/Toggle";

const CARRIERS = ["ALL", "MTN", "AIRTEL", "GLO", "9MOBILE"] as const;
const resolveCarrierImage = (carrier: string) => {
  const normalized = String(carrier || "").trim().toUpperCase();
  const imageMap: Record<string, string> = {
    MTN: "/carriers/mtn.png",
    AIRTEL: "/carriers/airtel.png",
    GLO: "/carriers/glo.png",
    "9MOBILE": "/carriers/9mobile.png",
    AEDC: "/branding/logo.png",
    IKEDC: "/branding/logo.png",
    KEDCO: "/branding/logo.png",
    PHED: "/branding/logo.png",
    JED: "/branding/logo.png",
    DSTV: "/branding/logo.png",
    GOTV: "/branding/logo.png",
    STARTIMES: "/branding/logo.png",
    VTUGATE: "/branding/logo.png",
  };
  return imageMap[normalized] || "/branding/logo.png";
};

interface GatewayControl {
  carrier: string;
  gateway: string;
  active: boolean;
  serviceCount: number;
}

type PlanForm = {
  network: AdminVtuPlan["network"];
  category: AdminVtuPlan["category"];
  capacity: string;
  duration: AdminVtuPlan["duration"];
  price: string;
};

const emptyPlanForm: PlanForm = {
  network: "MTN",
  category: "GENERAL",
  capacity: "",
  duration: "monthly",
  price: "",
};

export default function VtuServicesPage() {
  const [dispatches, setDispatches] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [carrier, setCarrier] = useState<string>("ALL");
  const [gateways, setGateways] = useState<GatewayControl[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [servicesCheckedAt, setServicesCheckedAt] = useState<string | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [plans, setPlans] = useState<AdminVtuPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<PlanForm>(emptyPlanForm);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [savingPlanId, setSavingPlanId] = useState<number | null>(null);

  // Live Provider Data Plans State
  const [dataNetwork, setDataNetwork] = useState<"MTN" | "AIRTEL" | "GLO" | "9MOBILE">("MTN");
  const [dataCategoryFilter, setDataCategoryFilter] = useState<string>("ALL");
  const [dataSearchQuery, setDataSearchQuery] = useState<string>("");
  const [livePlans, setLivePlans] = useState<ProviderLivePlan[]>([]);
  const [loadingLivePlans, setLoadingLivePlans] = useState(false);
  const [livePlansError, setLivePlansError] = useState<string | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingPlanCode, setSavingPlanCode] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Cable Price Overrides State
  const [cableOverrides, setCableOverrides] = useState<CablePriceOverride[]>([]);
  const [cableLoading, setCableLoading] = useState(true);
  const [cableError, setCableError] = useState<string | null>(null);
  const [cableForm, setCableForm] = useState<{ provider: "DSTV" | "GOTV" | "STARTIMES"; plan_code: string; price: string }>({
    provider: "DSTV",
    plan_code: "",
    price: "",
  });
  const [savingCable, setSavingCable] = useState(false);
  const [actionCableId, setActionCableId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminVtuServices()
      .then((response) => {
        if (cancelled) return;
        const carriers = ["MTN", "AIRTEL", "GLO", "9MOBILE"];
        setGateways(carriers.map((carrierName) => {
          const matchingServices = response.services.filter((service) => service.network === carrierName);
          return {
            carrier: carrierName,
            gateway: response.provider,
            active: matchingServices.length > 0,
            serviceCount: matchingServices.length,
          };
        }));
        setServicesCheckedAt(response.checkedAt);
        setServiceError(null);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setServiceError(error instanceof Error ? error.message : "Could not load VTU services.");
          setGateways([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingServices(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAdminTransactions(1, 25, { carrier: carrier === "ALL" ? undefined : carrier })
      .then((res) => {
        if (!cancelled) {
          setDispatches(res.data);
          setDispatchError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDispatches([]);
          setDispatchError(error instanceof Error ? error.message : "Could not load dispatches.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [carrier]);

  useEffect(() => {
    let cancelled = false;
    manageAdminVtuPlans({ action: "list" })
      .then((response) => {
        if (!cancelled) setPlans(response.plans || []);
      })
      .catch((error: unknown) => {
        if (!cancelled) setPlansError(error instanceof Error ? error.message : "Could not load admin plans.");
      })
      .finally(() => {
        if (!cancelled) setPlansLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingPlan(true);
    setPlansError(null);
    try {
      const response = await manageAdminVtuPlans({
        action: "create",
        ...planForm,
        capacity: planForm.capacity.trim(),
        price: Number(planForm.price),
        enabled: true,
      });
      if (!response.plan) throw new Error("The created plan was not returned.");
      setPlans((current) => [...current, response.plan!].sort((a, b) => a.capacity_mb - b.capacity_mb));
      setPlanForm(emptyPlanForm);
    } catch (error) {
      setPlansError(error instanceof Error ? error.message : "Could not create plan.");
    } finally {
      setCreatingPlan(false);
    }
  }

  async function updatePlan(plan: AdminVtuPlan, changes: Partial<PlanForm> & { enabled?: boolean }) {
    setSavingPlanId(plan.id);
    setPlansError(null);
    try {
      const response = await manageAdminVtuPlans({
        action: "update",
        id: plan.id,
        network: changes.network || plan.network,
        category: changes.category || plan.category,
        capacity: (changes.capacity ?? plan.capacity).trim(),
        duration: changes.duration || plan.duration,
        price: Number(changes.price ?? plan.price_kobo / 100),
        enabled: typeof changes.enabled === "boolean" ? changes.enabled : plan.enabled,
      });
      if (!response.plan) throw new Error("The updated plan was not returned.");
      setPlans((current) => current.map((item) => item.id === plan.id ? response.plan! : item));
    } catch (error) {
      setPlansError(error instanceof Error ? error.message : "Could not update plan.");
    } finally {
      setSavingPlanId(null);
    }
  }

  async function deletePlan(plan: AdminVtuPlan) {
    if (!window.confirm(`Delete ${plan.network} ${plan.capacity} plan?`)) return;
    setSavingPlanId(plan.id);
    setPlansError(null);
    try {
      await manageAdminVtuPlans({ action: "delete", id: plan.id });
      setPlans((current) => current.filter((item) => item.id !== plan.id));
    } catch (error) {
      setPlansError(error instanceof Error ? error.message : "Could not delete plan.");
    } finally {
      setSavingPlanId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    manageCablePriceOverrides({ action: "list" })
      .then((res) => {
        if (!cancelled) setCableOverrides(res.overrides || []);
      })
      .catch((err) => {
        if (!cancelled) setCableError(err instanceof Error ? err.message : "Could not load cable price overrides.");
      })
      .finally(() => {
        if (!cancelled) setCableLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function saveCableOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingCable(true);
    setCableError(null);
    try {
      const res = await manageCablePriceOverrides({
        action: "upsert",
        provider: cableForm.provider,
        plan_code: cableForm.plan_code.trim(),
        price: Number(cableForm.price),
      });
      if (!res.override) throw new Error("Could not save price override.");
      setCableOverrides((current) => {
        const exists = current.some((item) => item.provider === res.override!.provider && item.plan_code === res.override!.plan_code);
        if (exists) {
          return current.map((item) => item.provider === res.override!.provider && item.plan_code === res.override!.plan_code ? res.override! : item);
        }
        return [...current, res.override!];
      });
      setCableForm({ provider: "DSTV", plan_code: "", price: "" });
    } catch (err) {
      setCableError(err instanceof Error ? err.message : "Failed to save price override.");
    } finally {
      setSavingCable(false);
    }
  }

  async function updateCablePrice(item: CablePriceOverride, newPrice: string) {
    const price = Number(newPrice);
    if (!Number.isFinite(price) || price <= 0 || price === item.price) return;
    setActionCableId(item.id);
    setCableError(null);
    try {
      const res = await manageCablePriceOverrides({
        action: "upsert",
        provider: item.provider,
        plan_code: item.plan_code,
        price,
      });
      if (res.override) {
        setCableOverrides((current) => current.map((o) => o.id === item.id ? res.override! : o));
      }
    } catch (err) {
      setCableError(err instanceof Error ? err.message : "Failed to update price.");
    } finally {
      setActionCableId(null);
    }
  }

  async function deleteCableOverride(item: CablePriceOverride) {
    if (!window.confirm(`Remove custom price for ${item.provider} (${item.plan_code})?`)) return;
    setActionCableId(item.id);
    setCableError(null);
    try {
      await manageCablePriceOverrides({
        action: "delete",
        provider: item.provider,
        plan_code: item.plan_code,
      });
      setCableOverrides((current) => current.filter((o) => o.id !== item.id));
    } catch (err) {
      setCableError(err instanceof Error ? err.message : "Failed to delete price override.");
    } finally {
      setActionCableId(null);
    }
  }

  // Load live data plans from provider for the selected network
  useEffect(() => {
    let cancelled = false;
    setLoadingLivePlans(true);
    setLivePlansError(null);
    managePriceOverrides({ action: "fetch_provider_plans", provider: dataNetwork })
      .then((res) => {
        if (cancelled) return;
        const plans = res.plans || [];
        setLivePlans(plans);
        const drafts: Record<string, string> = {};
        plans.forEach((p) => {
          drafts[p.plan_code] = String(p.selling_price);
        });
        setPriceDrafts(drafts);
      })
      .catch((err) => {
        if (cancelled) return;
        setLivePlansError(err instanceof Error ? err.message : "Failed to load live data plans from provider.");
      })
      .finally(() => {
        if (!cancelled) setLoadingLivePlans(false);
      });
    return () => { cancelled = true; };
  }, [dataNetwork]);

  async function savePlanPrice(plan: ProviderLivePlan) {
    const rawVal = priceDrafts[plan.plan_code] ?? String(plan.selling_price);
    const priceVal = Number(rawVal);
    if (!Number.isFinite(priceVal) || priceVal <= 0) {
      alert("Please enter a valid price in Naira.");
      return;
    }
    setSavingPlanCode(plan.plan_code);
    setLivePlansError(null);
    setSuccessMsg(null);
    try {
      await managePriceOverrides({
        action: "upsert",
        provider: dataNetwork,
        plan_code: plan.plan_code,
        price: priceVal,
        enabled: true,
        label: plan.name,
      });
      setLivePlans((current) =>
        current.map((p) =>
          p.plan_code === plan.plan_code
            ? {
                ...p,
                selling_price: priceVal,
                enabled: true,
                has_override: true,
                margin: priceVal - p.cost_price,
              }
            : p,
        ),
      );
      setSuccessMsg(`Saved & activated ${plan.name} at ₦${priceVal.toLocaleString()}`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setLivePlansError(err instanceof Error ? err.message : "Failed to save price.");
    } finally {
      setSavingPlanCode(null);
    }
  }
  const saveLivePlanPrice = savePlanPrice;

  async function toggleLivePlanActive(plan: ProviderLivePlan, newEnabled: boolean) {
    setSavingPlanCode(plan.plan_code);
    setLivePlansError(null);
    try {
      const currentPrice = Number(priceDrafts[plan.plan_code] ?? plan.selling_price);
      await managePriceOverrides({
        action: "upsert",
        provider: dataNetwork,
        plan_code: plan.plan_code,
        price: currentPrice,
        enabled: newEnabled,
        label: plan.name,
      });
      setLivePlans((current) =>
        current.map((p) =>
          p.plan_code === plan.plan_code
            ? {
                ...p,
                enabled: newEnabled,
                has_override: true,
              }
            : p,
        ),
      );
    } catch (err) {
      setLivePlansError(err instanceof Error ? err.message : "Failed to toggle plan.");
    } finally {
      setSavingPlanCode(null);
    }
  }

  async function resetLivePlanPrice(plan: ProviderLivePlan) {
    if (!window.confirm(`Reset "${plan.name}" to provider default cost price of ₦${plan.cost_price}?`)) return;
    setSavingPlanCode(plan.plan_code);
    setLivePlansError(null);
    try {
      await managePriceOverrides({
        action: "delete",
        provider: dataNetwork,
        plan_code: plan.plan_code,
      });
      setPriceDrafts((prev) => ({ ...prev, [plan.plan_code]: String(plan.cost_price) }));
      setLivePlans((current) =>
        current.map((p) =>
          p.plan_code === plan.plan_code
            ? {
                ...p,
                selling_price: p.cost_price,
                has_override: false,
                enabled: true,
                margin: 0,
              }
            : p,
        ),
      );
    } catch (err) {
      setLivePlansError(err instanceof Error ? err.message : "Failed to reset price.");
    } finally {
      setSavingPlanCode(null);
    }
  }

  const failed = dispatches.filter((d) => d.status === "FAILED").length;
  const pending = dispatches.filter((d) => d.status === "PENDING").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        breadcrumbs={["Operations", "VTU Services"]}
        title="VTU Services & Routing"
        description="Monitor network dispatch pipes and control automated delivery per telecom carrier."
        actions={
          <div className="flex items-center gap-2">
            {failed > 0 && (
              <span className="px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {failed} Failed
              </span>
            )}
            {pending > 0 && (
              <span className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                {pending} Pending
              </span>
            )}
          </div>
        }
      />

      {serviceError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-900" role="alert">
          {serviceError}
        </div>
      )}
      {dispatchError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-900" role="alert">
          {dispatchError}
        </div>
      )}

      {/* Gateway Routing Toggles  -  Pixel-perfect Toggle component */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Carrier Gateway Controls</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Turn network dispatches on or off
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {servicesCheckedAt ? `Checked ${formatTimeAgo(servicesCheckedAt)}` : "Live provider catalog"}
          </span>
        </div>

        {loadingServices ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {gateways.map((g) => (
            <div
              key={g.carrier}
              className="flex flex-col justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Image
                      src={resolveCarrierImage(g.carrier)}
                      alt={g.carrier}
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                    <span className="font-bold text-sm text-slate-900">{g.carrier}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">{g.serviceCount} services</span>
                </div>
                <p className="text-xs text-slate-500 truncate">{g.gateway}</p>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/60">
                <span
                  className={`text-xs font-semibold ${
                    g.active ? "text-emerald-700" : "text-slate-500"
                  }`}
                >
                  {g.active ? "Available" : "Not configured"}
                </span>
                <span className="text-[11px] text-slate-400">Read-only</span>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* LIVE PROVIDER MOBILE DATA PLANS & PRICING CONTROLS */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Mobile Data Plans & Pricing Control</h2>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                Live Provider Plans
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Edit selling prices for data plans returned by VTU Gate. Your custom selling price is deducted from user wallets, and you can turn individual plans on or off anytime.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoadingLivePlans(true);
              managePriceOverrides({ action: "fetch_provider_plans", provider: dataNetwork })
                .then((res) => {
                  const plans = res.plans || [];
                  setLivePlans(plans);
                  const drafts: Record<string, string> = {};
                  plans.forEach((p) => { drafts[p.plan_code] = String(p.selling_price); });
                  setPriceDrafts(drafts);
                })
                .catch((err) => setLivePlansError(err instanceof Error ? err.message : "Failed to reload."))
                .finally(() => setLoadingLivePlans(false));
            }}
            disabled={loadingLivePlans}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 self-start sm:self-auto cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[14px] ${loadingLivePlans ? "animate-spin" : ""}`}>
              sync
            </span>
            Refresh Plans
          </button>
        </div>

        {/* Network Selector Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(["MTN", "AIRTEL", "GLO", "9MOBILE"] as const).map((net) => {
            const countForNet = livePlans.filter((p) => p.has_override).length;
            const isSelected = dataNetwork === net;
            return (
              <button
                key={net}
                type="button"
                onClick={() => setDataNetwork(net)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Image
                  src={resolveCarrierImage(net)}
                  alt={net}
                  width={16}
                  height={16}
                  className="object-contain"
                />
                <span>{net} Data</span>
                {isSelected && countForNet > 0 && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    {countForNet} customized
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {["ALL", "SME", "GIFTING", "DIRECT", "GENERAL"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setDataCategoryFilter(cat)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  dataCategoryFilter === cat
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat === "ALL" ? "All Categories" : cat}
              </button>
            ))}
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search plans (e.g. 1GB, 30 days)..."
              value={dataSearchQuery}
              onChange={(e) => setDataSearchQuery(e.target.value)}
              className="h-8 w-full sm:w-64 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Success & Error Banners */}
        {successMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
            {successMsg}
          </div>
        )}
        {livePlansError && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {livePlansError}
          </div>
        )}

        {/* Plans Table / Cards */}
        {loadingLivePlans ? (
          <div className="mt-6 flex flex-col items-center justify-center py-12 text-slate-500">
            <div className="h-7 w-7 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
            <p className="text-xs">Fetching live plans from provider for {dataNetwork}...</p>
          </div>
        ) : livePlans.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
            No data plans returned from VTU Gate for {dataNetwork}.
          </div>
        ) : (
          <div className="mt-4 divide-y divide-slate-100 overflow-x-auto">
            {(() => {
              const filtered = livePlans.filter((p) => {
                const matchCategory =
                  dataCategoryFilter === "ALL" ||
                  p.category.toUpperCase().includes(dataCategoryFilter);
                const matchSearch =
                  !dataSearchQuery ||
                  p.name.toLowerCase().includes(dataSearchQuery.toLowerCase()) ||
                  p.plan_code.toLowerCase().includes(dataSearchQuery.toLowerCase());
                return matchCategory && matchSearch;
              });

              if (filtered.length === 0) {
                return (
                  <p className="py-8 text-center text-xs text-slate-400">
                    No plans match the search & category filter.
                  </p>
                );
              }

              return (
                <div className="grid gap-3 pt-2">
                  {filtered.map((plan, idx) => {
                    const draftVal = priceDrafts[plan.plan_code] ?? String(plan.selling_price);
                    const draftNum = Number(draftVal);
                    const currentMargin = Number.isFinite(draftNum) ? draftNum - plan.cost_price : plan.margin;
                    const marginPercent = plan.cost_price > 0 ? ((currentMargin / plan.cost_price) * 100).toFixed(1) : "0";
                    const isSaving = savingPlanCode === plan.plan_code;
                    const isModified = Number.isFinite(draftNum) && draftNum !== plan.selling_price;
                    const uniqueKey = `${plan.service_id}:${plan.plan_code}:${idx}`;

                    return (
                      <article
                        key={uniqueKey}
                        className={`grid min-w-0 gap-3 rounded-xl border p-3.5 transition-all md:grid-cols-[1.5fr_1fr_1.2fr_auto_auto] md:items-center ${
                          !plan.enabled
                            ? "border-slate-200 bg-slate-50/60 opacity-60"
                            : plan.has_override
                            ? "border-emerald-200/80 bg-emerald-50/20 shadow-xs"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        {/* Plan Info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 truncate">{plan.name}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              {plan.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Code: <span className="font-semibold text-slate-600">{plan.plan_code}</span>
                          </p>
                        </div>

                        {/* Cost & Margins */}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-400">Provider Cost:</span>
                            <span className="font-mono text-xs font-semibold text-slate-700">
                              {formatNaira(plan.cost_price)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-slate-400">Margin:</span>
                            <span
                              className={`text-[11px] font-bold font-mono ${
                                currentMargin > 0
                                  ? "text-emerald-600"
                                  : currentMargin < 0
                                  ? "text-rose-600"
                                  : "text-slate-500"
                              }`}
                            >
                              {currentMargin >= 0 ? `+₦${currentMargin.toLocaleString()}` : `-₦${Math.abs(currentMargin).toLocaleString()}`} ({marginPercent}%)
                            </span>
                          </div>
                        </div>

                        {/* Selling Price Edit Input */}
                        <div className="flex items-center gap-2">
                          <label className="grid gap-0.5 text-[11px] font-semibold text-slate-600 w-full">
                            Selling Price (NGN)
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₦</span>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={draftVal}
                                disabled={isSaving}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPriceDrafts((prev) => ({ ...prev, [plan.plan_code]: val }));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void savePlanPrice(plan);
                                  }
                                }}
                                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-6 pr-2 text-xs font-bold text-slate-900 focus:border-primary focus:outline-none"
                              />
                            </div>
                          </label>
                          <button
                            type="button"
                            onClick={() => void savePlanPrice(plan)}
                            disabled={isSaving || (!isModified && plan.has_override)}
                            className={`h-9 px-3 text-xs font-semibold rounded-lg shrink-0 transition-all cursor-pointer self-end ${
                              isModified
                                ? "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                                : plan.has_override
                                ? "border border-slate-200 text-slate-400 bg-slate-50"
                                : "bg-slate-900 text-white hover:bg-slate-800"
                            }`}
                          >
                            {isSaving ? "Saving..." : isModified ? "Save" : plan.has_override ? "Saved" : "Set"}
                          </button>
                        </div>

                        {/* Enabled / Disabled Toggle */}
                        <div className="flex items-center gap-2 pb-0.5">
                          <Toggle
                            checked={plan.enabled}
                            onChange={(enabled) => void toggleLivePlanActive(plan, enabled)}
                            id={`toggle-live-plan-${plan.service_id}-${plan.plan_code}-${idx}`}
                            label={`Toggle ${plan.name}`}
                            disabled={isSaving}
                          />
                          <span className={`text-xs font-semibold ${plan.enabled ? "text-emerald-700" : "text-slate-400"}`}>
                            {plan.enabled ? "Active" : "Disabled"}
                          </span>
                        </div>

                        {/* Reset button if custom override exists */}
                        <div className="flex justify-end">
                          {plan.has_override ? (
                            <button
                              type="button"
                              onClick={() => void resetLivePlanPrice(plan)}
                              disabled={isSaving}
                              title="Reset price to provider default cost"
                              className="h-8 px-2.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 cursor-pointer disabled:opacity-50"
                            >
                              Reset
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-mono px-2">Default</span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </section>

      {/* Cable TV Price Overrides Section */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Cable TV Price Overrides</h2>
            <p className="text-xs text-slate-500">
              Override provider prices for DSTV, GOtv, and StarTimes packages. These prices will be deducted from user wallets.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {cableOverrides.length} active {cableOverrides.length === 1 ? "override" : "overrides"}
          </span>
        </div>

        {cableError && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {cableError}
          </div>
        )}

        <form onSubmit={saveCableOverride} className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-4">
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Provider
            <select
              value={cableForm.provider}
              onChange={(e) => setCableForm((prev) => ({ ...prev, provider: e.target.value as "DSTV" | "GOTV" | "STARTIMES" }))}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs"
            >
              <option value="DSTV">DSTV</option>
              <option value="GOTV">GOTV</option>
              <option value="STARTIMES">STARTIMES</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Plan Code
            <input
              type="text"
              placeholder="e.g. dstv-padi, gotv-max"
              value={cableForm.plan_code}
              onChange={(e) => setCableForm((prev) => ({ ...prev, plan_code: e.target.value }))}
              required
              className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Selling Price (NGN)
            <input
              type="number"
              min="1"
              step="0.01"
              placeholder="e.g. 3500"
              value={cableForm.price}
              onChange={(e) => setCableForm((prev) => ({ ...prev, price: e.target.value }))}
              required
              className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={savingCable}
              className="h-9 w-full rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
            >
              {savingCable ? "Saving..." : "Set Price Override"}
            </button>
          </div>
        </form>

        {cableLoading ? (
          <div className="mt-4 flex items-center justify-center py-6 text-xs text-slate-400">
            Loading cable price overrides...
          </div>
        ) : cableOverrides.length === 0 ? (
          <p className="mt-4 text-xs text-slate-500">
            No price overrides defined yet. Provider API default prices will be used.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {cableOverrides.map((override) => (
              <article
                key={override.id}
                className="grid min-w-0 gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
              >
                <div>
                  <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                    {override.provider}
                  </span>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{override.plan_code}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Current Overridden Price</span>
                  <p className="text-sm font-bold text-emerald-600">{formatNaira(override.price)}</p>
                </div>
                <label className="grid gap-1 text-xs font-semibold text-slate-600">
                  Edit Price (NGN)
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    defaultValue={override.price}
                    disabled={actionCableId === override.id}
                    onBlur={(e) => void updateCablePrice(override, e.target.value)}
                    className="h-9 rounded-lg border border-slate-300 px-2 text-xs"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void deleteCableOverride(override)}
                  disabled={actionCableId === override.id}
                  className="h-9 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  Remove
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Carrier Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {CARRIERS.map((c) => (
          <button
            key={c}
            onClick={() => setCarrier(c)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              carrier === c
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {c !== "ALL" && (
              <Image
                src={resolveCarrierImage(c)}
                alt={c}
                width={14}
                height={14}
                className="object-contain"
              />
            )}
            {c === "ALL" ? "All Networks" : c}
          </button>
        ))}
      </div>

      {/* Dispatch Stream Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Live Dispatches</h2>
          <span className="text-xs text-slate-400 font-mono">
            {dispatches.length} recent orders
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-medium">
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Reference
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Phone Number
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Network
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Plan / SKU
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Amount
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Delivery Status
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Gateway
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Time
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] uppercase tracking-wider font-semibold">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dispatches.map((d) => (
                  <tr
                    key={d.id}
                    className={`hover:bg-slate-50/60 transition-colors ${
                      d.status === "FAILED" ? "bg-rose-50/40" : ""
                    }`}
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-400 whitespace-nowrap">
                      {d.reference}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-900 whitespace-nowrap font-medium">
                      {d.customerPhone}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Image
                          src={resolveCarrierImage(d.carrier)}
                          alt={d.carrier}
                          width={16}
                          height={16}
                          className="object-contain"
                        />
                        <span className="text-xs font-semibold text-slate-800">{d.carrier}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-700 max-w-[140px] truncate whitespace-nowrap">
                      {d.plan}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                      {formatNaira(d.sellingPrice)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <Badge
                        variant={txStatusVariant(d.status)}
                        label={
                          d.status === "SUCCESS"
                            ? "Delivered"
                            : d.status === "PENDING"
                            ? "Pending"
                            : d.status === "REFUNDED"
                            ? "Refunded"
                            : "Failed"
                        }
                        withDot
                      />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {d.gateway}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 font-mono whitespace-nowrap">
                      {formatTimeAgo(d.timestamp)}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {d.status === "FAILED" ? (
                        <span className="text-slate-400 text-xs">Retry unavailable</span>
                      ) : (
                        <span className="text-slate-300 text-xs"> - </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
