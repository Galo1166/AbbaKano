"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  fetchMarginSettings,
  fetchSystemSettings,
  updateSystemSettings,
  updateMargins,
} from "@admin/services/api";
import PageHeader from "@admin/components/layout/PageHeader";
import Toggle from "@admin/components/ui/Toggle";
import type { MarginSetting, SystemSettings } from "@admin/types/telecom";

const CARRIER_IMAGES: Record<string, string> = {
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

const resolveCarrierImage = (carrier: string) => CARRIER_IMAGES[String(carrier || "").trim().toUpperCase()] || "/branding/logo.png";

export default function SettingsPage() {
  const [margins, setMargins] = useState<MarginSetting[]>([]);
  const [initialMargins, setInitialMargins] = useState<MarginSetting[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [initialSettings, setInitialSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [activeTab, setActiveTab] = useState("margins");
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [auditReason, setAuditReason] = useState("");

  useEffect(() => {
    Promise.all([fetchMarginSettings(), fetchSystemSettings()]).then(([m, s]) => {
      setMargins(m);
      setInitialMargins(m);
      setSettings(s);
      setInitialSettings(s);
      setLoading(false);
    }).catch((error: unknown) => {
      setLoadError(error instanceof Error ? error.message : "Could not load admin settings.");
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    const reason = auditReason.trim();
    if (reason.length < 5) {
      setSaveError("Enter a reason of at least 5 characters for these settings changes.");
      return;
    }
    let settingsSaved = false;
    const savedMarginCarriers = new Set<string>();
    setSaving(true);
    setSaveError("");
    try {
      const settingsUpdates = Object.fromEntries(
        Object.entries(settings || {}).filter(([key, value]) =>
          JSON.stringify(value) !== JSON.stringify(initialSettings?.[key as keyof SystemSettings])
        ),
      ) as Partial<SystemSettings>;
      const marginUpdates = margins.filter((margin) => {
        const initial = initialMargins.find((item) => item.carrier === margin.carrier);
        return initial && (
          initial.wholesaleBase !== margin.wholesaleBase ||
          initial.smeMargin !== margin.smeMargin ||
          initial.giftingMargin !== margin.giftingMargin ||
          initial.airtimePercent !== margin.airtimePercent ||
          initial.isSalesActive !== margin.isSalesActive
        );
      });
      if (Object.keys(settingsUpdates).length === 0 && marginUpdates.length === 0) {
        setSavedNotice("No settings changes to save.");
        setTimeout(() => setSavedNotice(null), 3500);
        return;
      }

      if (Object.keys(settingsUpdates).length > 0) {
        await updateSystemSettings(settingsUpdates, reason);
        settingsSaved = true;
      }
      for (const margin of marginUpdates) {
        await updateMargins(margin.carrier, {
          wholesaleBase: margin.wholesaleBase,
          smeMargin: margin.smeMargin,
          giftingMargin: margin.giftingMargin,
          airtimePercent: margin.airtimePercent,
          isSalesActive: margin.isSalesActive,
        }, reason);
        savedMarginCarriers.add(margin.carrier);
      }
      setInitialSettings(settings);
      setInitialMargins(margins);
      setAuditReason("");
      setSavedNotice("Settings saved successfully.");
      setTimeout(() => setSavedNotice(null), 3500);
    } catch (error) {
      if (settingsSaved) setInitialSettings(settings);
      if (savedMarginCarriers.size > 0) {
        setInitialMargins((current) => current.map((initial) => {
          if (!savedMarginCarriers.has(initial.carrier)) return initial;
          return margins.find((margin) => margin.carrier === initial.carrier) || initial;
        }));
      }
      setSaveError(error instanceof Error ? error.message : "Could not save admin settings.");
    } finally {
      setSaving(false);
    }
  };

  const updateMargin = (carrier: string, field: keyof MarginSetting, value: unknown) => {
    setMargins((prev) =>
      prev.map((m) => (m.carrier === carrier ? { ...m, [field]: value } : m))
    );
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
      </div>
    );

  if (loadError)
    return (
      <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-900">
        Could not load admin settings: {loadError}
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        breadcrumbs={["Administration", "Settings"]}
        title="Settings & Pricing Margins"
        description="Configure wholesale pricing margins, app availability, and low balance alert contacts."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-3.5 py-2 rounded-xl border border-outline-variant/40 text-xs sm:text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              id="btn-discard-settings"
            >
              Discard Changes
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-bold hover:bg-primary-container transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-70 shadow-sm"
              id="btn-save-all-settings"
            >
              {saving ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
              )}
              <span>Save Changes</span>
            </button>
          </div>
        }
      />

      {savedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
          <span>{savedNotice}</span>
        </div>
      )}
      {saveError && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-900">
          {saveError}
        </div>
      )}
      <label className="block space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-950">
        Reason for these settings changes <span className="text-rose-700">*</span>
        <textarea
          value={auditReason}
          onChange={(event) => setAuditReason(event.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Explain why these settings or pricing margins need to change"
          className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-normal text-slate-800 outline-none focus:border-primary"
        />
        <span className="block font-normal text-amber-900/80">
          The reason is saved with each audit entry. Only values that changed are written.
        </span>
      </label>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
              Average Net SME Spread
            </span>
            <span className="material-symbols-outlined text-primary text-[20px]">
              trending_up
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-on-surface font-mono">
            ?15.00 <span className="text-xs text-outline font-normal font-sans">/ GB</span>
          </div>
          <p className="text-xs text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10">
            Average profit margin across SME data plans
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
              Mobile App Access
            </span>
            <span className="material-symbols-outlined text-emerald-700 text-[20px]">
              storefront
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                settings?.appMaintenanceMode ? "bg-amber-500" : "bg-emerald-600"
              }`}
            />
            <span className="text-base font-bold text-on-surface">
              {settings?.appMaintenanceMode ? "Maintenance Mode" : "Online & Active"}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10">
            {settings?.appMaintenanceMode
              ? "Customer app purchases currently paused"
              : "Accepting customer orders normally"}
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
              Emergency Low Balance Alert
            </span>
            <span className="material-symbols-outlined text-amber-600 text-[20px]">
              notifications_active
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-on-surface">SMS Alerts</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              Active
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10 font-mono truncate">
            {settings?.alertPhoneNumbers[0] || "08031234567"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface-container-lowest rounded-2xl p-1.5 shadow-card border border-outline-variant/30 flex flex-wrap gap-1">
        {[
          { id: "margins", label: "Wholesale Margins", icon: "cell_tower" },
          { id: "providers", label: "Provider Routing", icon: "route" },
          { id: "maintenance", label: "App Maintenance", icon: "build" },
          { id: "alerts", label: "Alert Contacts", icon: "contact_phone" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Margins */}
      {activeTab === "margins" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {margins.map((m) => {
            const smePrice = (m.wholesaleBase + m.smeMargin).toFixed(2);
            const giftingPrice = (m.wholesaleBase + m.giftingMargin).toFixed(2);

            return (
              <div
                key={m.carrier}
                className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card p-5 sm:p-6 flex flex-col justify-between gap-5"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center p-1.5 shrink-0">
                      <Image
                        src={resolveCarrierImage(m.carrier)}
                        alt={m.carrier}
                        width={28}
                        height={28}
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-base text-on-surface leading-tight">{m.carrier}</p>
                      <p className="text-xs text-outline mt-0.5">Updated by {m.lastUpdatedBy}</p>
                    </div>
                  </div>

                  {/* Sales Switch */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-on-surface-variant">
                      {m.isSalesActive ? "Active" : "Paused"}
                    </span>
                    <Toggle
                      checked={m.isSalesActive}
                      onChange={(checked) => updateMargin(m.carrier, "isSalesActive", checked)}
                      id={`btn-toggle-sales-${m.carrier.toLowerCase()}`}
                      label={`Toggle sales for ${m.carrier}`}
                    />
                  </div>
                </div>

                {/* Inputs */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-1">
                        Wholesale Base (?/GB)
                      </label>
                      <input
                        type="number"
                        value={m.wholesaleBase}
                        onChange={(e) =>
                          updateMargin(m.carrier, "wholesaleBase", parseFloat(e.target.value) || 0)
                        }
                        className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-sm font-mono text-on-surface outline-none border border-outline-variant/30 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-1">
                        SME Margin (?/GB)
                      </label>
                      <input
                        type="number"
                        value={m.smeMargin}
                        onChange={(e) =>
                          updateMargin(m.carrier, "smeMargin", parseFloat(e.target.value) || 0)
                        }
                        className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-sm font-mono text-on-surface outline-none border border-outline-variant/30 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-1">
                        Gifting Margin (?/GB)
                      </label>
                      <input
                        type="number"
                        value={m.giftingMargin}
                        onChange={(e) =>
                          updateMargin(m.carrier, "giftingMargin", parseFloat(e.target.value) || 0)
                        }
                        className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-sm font-mono text-on-surface outline-none border border-outline-variant/30 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-1">
                        Airtime Comm. (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={m.airtimePercent}
                        onChange={(e) =>
                          updateMargin(m.carrier, "airtimePercent", parseFloat(e.target.value) || 0)
                        }
                        className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-sm font-mono text-on-surface outline-none border border-outline-variant/30 focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Selling Price Calculation Preview */}
                  <div className="bg-surface-container-low rounded-xl p-3 text-xs font-mono text-on-surface-variant flex items-center justify-between border border-outline-variant/20">
                    <span>
                      SME: <strong className="text-on-surface">?{smePrice}/GB</strong>
                    </span>
                    <span>
                      Gifting: <strong className="text-on-surface">?{giftingPrice}/GB</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "providers" && settings && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card p-6 space-y-6">
          <div>
            <h2 className="font-bold text-base text-on-surface mb-1">Purchase Provider Routing</h2>
            <p className="text-xs sm:text-sm text-on-surface-variant">
              Choose the provider independently for customer airtime and data purchases. Routing changes require an audit reason and do not automatically fail over.
            </p>
          </div>
          {([
            ["airtimeProviderPrimary", "Airtime provider"],
            ["dataProviderPrimary", "Data provider"],
          ] as const).map(([key, label]) => (
            <div key={key} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <label htmlFor={key} className="text-sm font-semibold text-on-surface">{label}</label>
              <select
                id={key}
                value={settings[key]}
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, [key]: event.target.value as SystemSettings[typeof key] } : current
                  )
                }
                className="h-11 px-3 bg-surface-container-low rounded-xl text-sm text-on-surface outline-none border border-outline-variant/30 focus:border-primary"
              >
                <option value="ALRAHUZDATA">ALRAHUZDATA</option>
                <option value="BILALSADASUB">BilalSadaSub</option>
              </select>
            </div>
          ))}
          <p className="text-xs text-on-surface-variant border-t border-outline-variant/20 pt-4">
            BilalSadaSub routing is available only after its API token is configured as a Supabase Edge Function secret.
          </p>
        </div>
      )}

      {/* Tab: Maintenance */}
      {activeTab === "maintenance" && settings && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
            <div>
              <h2 className="font-bold text-base text-on-surface">
                Consumer Mobile App Maintenance Mode
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-1 leading-relaxed max-w-xl">
                When enabled, the customer-facing mobile application displays a maintenance screen and all order checkouts are rejected with HTTP 503.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-xs font-bold ${settings.appMaintenanceMode ? "text-red-700" : "text-emerald-700"}`}>
                {settings.appMaintenanceMode ? "Maintenance On" : "Live Normal"}
              </span>
              <Toggle
                checked={settings.appMaintenanceMode}
                onChange={(checked) =>
                  setSettings((s) => (s ? { ...s, appMaintenanceMode: checked } : s))
                }
                id="btn-toggle-maintenance-mode"
                label="Toggle app maintenance mode"
              />
            </div>
          </div>

          {settings.appMaintenanceMode && (
            <div className="bg-red-50 border border-red-300 rounded-2xl p-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-red-600 text-[22px]">warning</span>
              <p className="text-xs sm:text-sm text-red-950 font-bold">
                Maintenance Mode is active across all regional mobile app endpoints.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-on-surface mb-2">
              Public Customer Maintenance Message
            </label>
            <textarea
              value={settings.maintenanceMessage}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, maintenanceMessage: e.target.value } : s))
              }
              rows={3}
              className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-xs sm:text-sm text-on-surface resize-none outline-none border border-outline-variant/30 focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">
                Low Balance Alert Threshold (₦)
              </label>
              <input
                type="number"
                value={settings.lowBalanceThresholdNaira}
                onChange={(e) =>
                  setSettings((s) =>
                    s ? { ...s, lowBalanceThresholdNaira: parseFloat(e.target.value) || 0 } : s
                  )
                }
                className="w-full h-11 px-4 bg-surface-container-low rounded-xl text-sm font-mono text-on-surface outline-none border border-outline-variant/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">
                Dual Authorization Limit (₦)
              </label>
              <input
                type="number"
                value={settings.dualApprovalAmountThreshold}
                onChange={(e) =>
                  setSettings((s) =>
                    s ? { ...s, dualApprovalAmountThreshold: parseFloat(e.target.value) || 0 } : s
                  )
                }
                className="w-full h-11 px-4 bg-surface-container-low rounded-xl text-sm font-mono text-on-surface outline-none border border-outline-variant/30 focus:border-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Alerts */}
      {activeTab === "alerts" && settings && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card p-6 space-y-5">
          <div>
            <h2 className="font-bold text-base text-on-surface mb-1">
              Emergency NOC Broadcast Telephone Numbers
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant">
              When carrier balances deplete below threshold, automatic SMS and WhatsApp alerts are dispatched to these numbers.
            </p>
          </div>

          <div className="space-y-4 max-w-md">
            {settings.alertPhoneNumbers.map((phone, idx) => (
              <div key={idx}>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  Alert Telephone {idx + 1}{" "}
                  {idx === 0 && <span className="text-primary font-bold">(Primary NOC)</span>}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) =>
                    setSettings((s) => {
                      if (!s) return s;
                      const nums = [...s.alertPhoneNumbers];
                      nums[idx] = e.target.value;
                      return { ...s, alertPhoneNumbers: nums };
                    })
                  }
                  className="w-full h-11 px-4 bg-surface-container-low rounded-xl text-sm font-mono text-on-surface outline-none border border-outline-variant/30 focus:border-primary"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
