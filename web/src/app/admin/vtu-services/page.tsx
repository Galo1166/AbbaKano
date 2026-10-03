"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import { fetchAdminTransactions, fetchAdminVtuServices, manageAdminVtuPlans } from "@admin/services/api";
import { formatNaira, formatTimeAgo } from "@admin/lib/utils";
import Badge, { txStatusVariant } from "@admin/components/ui/Badge";
import PageHeader from "@admin/components/layout/PageHeader";
import type { Transaction } from "@admin/types/telecom";
import type { AdminVtuPlan } from "@admin/services/api";
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

      {/* Gateway Routing Toggles — Pixel-perfect Toggle component */}
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

      <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col gap-1 mb-4">
          <h2 className="text-sm font-bold text-slate-900">Admin data plan catalog</h2>
          <p className="text-xs text-slate-500">
            Create and maintain plans by network, category, capacity, duration, and customer price. These plans are catalog records and do not change live provider routing.
          </p>
        </div>

        {plansError && (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
            {plansError}
          </p>
        )}

        <form onSubmit={createPlan} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] md:items-end">
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Network
            <select value={planForm.network} onChange={(event) => setPlanForm((current) => ({ ...current, network: event.target.value as PlanForm["network"] }))} className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs">
              {CARRIERS.filter((item) => item !== "ALL").map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Category
            <select value={planForm.category} onChange={(event) => setPlanForm((current) => ({ ...current, category: event.target.value as PlanForm["category"] }))} className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs">
              <option value="GENERAL">General</option>
              <option value="SME">SME Data</option>
              <option value="GIFTING">Gifting</option>
              <option value="DIRECT">Direct</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Capacity
            <input required type="text" maxLength={32} value={planForm.capacity} onChange={(event) => setPlanForm((current) => ({ ...current, capacity: event.target.value }))} className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm" placeholder="e.g. 3GB or 3072MB" />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Duration
            <select value={planForm.duration} onChange={(event) => setPlanForm((current) => ({ ...current, duration: event.target.value as PlanForm["duration"] }))} className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Price (NGN)
            <input required type="number" min="1" max="1000000" step="0.01" value={planForm.price} onChange={(event) => setPlanForm((current) => ({ ...current, price: event.target.value }))} className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm" placeholder="e.g. 1200" />
          </label>
          <button type="submit" disabled={creatingPlan} className="h-10 rounded-lg bg-primary px-4 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-60">
            {creatingPlan ? "Creating..." : "Create plan"}
          </button>
        </form>

        {plansLoading ? (
          <div className="flex items-center justify-center py-8"><div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
        ) : plans.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">No admin plans created yet.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {plans.map((plan) => (
              <article key={plan.id} className="grid min-w-0 gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto_auto] md:items-end">
                <div>
                  <p className="text-sm font-bold text-slate-900">{plan.capacity}</p>
                  <p className="text-[11px] text-slate-500">{plan.network} · {plan.category}</p>
                </div>
                <label className="grid gap-1 text-xs font-semibold text-slate-600">Capacity<input type="text" maxLength={32} defaultValue={plan.capacity} disabled={savingPlanId === plan.id} onBlur={(event) => void updatePlan(plan, { capacity: event.currentTarget.value })} className="h-9 rounded-lg border border-slate-300 px-2 text-xs" /></label>
                <label className="grid gap-1 text-xs font-semibold text-slate-600">Duration<select value={plan.duration} disabled={savingPlanId === plan.id} onChange={(event) => void updatePlan(plan, { duration: event.target.value as PlanForm["duration"] })} className="h-9 rounded-lg border border-slate-300 px-2 text-xs"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
                <label className="grid gap-1 text-xs font-semibold text-slate-600">Price (NGN)<input type="number" min="1" step="0.01" defaultValue={plan.price_kobo / 100} disabled={savingPlanId === plan.id} onBlur={(event) => void updatePlan(plan, { price: event.target.value })} className="h-9 rounded-lg border border-slate-300 px-2 text-xs" /></label>
                <div className="flex items-center gap-2 pb-1"><Toggle checked={plan.enabled} onChange={(enabled) => void updatePlan(plan, { enabled })} id={`toggle-plan-${plan.id}`} label={`Toggle ${plan.network} plan`} disabled={savingPlanId === plan.id} /><span className="text-xs text-slate-600">{plan.enabled ? "On" : "Off"}</span></div>
                <button type="button" onClick={() => void deletePlan(plan)} disabled={savingPlanId === plan.id} className="h-9 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 disabled:opacity-50">Delete</button>
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
                        <span className="text-slate-300 text-xs">—</span>
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
