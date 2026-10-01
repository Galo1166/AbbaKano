const crypto = require("crypto");
const { VtuGateProvider } = require("./vtugate-provider");

const PROVIDER_URL = process.env.VTU_PROVIDER_URL;
const PROVIDER_API_KEY = process.env.VTU_PROVIDER_API_KEY;
const VTU_GATE_BASE_URL = process.env.VTU_GATE_BASE_URL || "https://api.vtugate.com/api/v1";
const VTU_GATE_API_KEY = process.env.VTU_GATE_API_KEY;
const VTU_GATE_PROVIDER = new VtuGateProvider({ baseUrl: VTU_GATE_BASE_URL, apiKey: VTU_GATE_API_KEY });
const PRIMARY_PROVIDER = (process.env.VTU_PRIMARY_PROVIDER || "smeplug").toLowerCase();
const VTU_GATE_ONLY = PRIMARY_PROVIDER === "vtugate";
const VTU_PLAN_CACHE_TTL_MS = Number(process.env.VTU_PLAN_CACHE_TTL_MS || 300000);
const vtuPlanCache = new Map();
const FALLBACK_PROVIDER = String(process.env.VTU_FALLBACK_PROVIDER || "").trim().toLowerCase();
const PROVIDER_TIMEOUT_MS = Number(process.env.VTU_PROVIDER_TIMEOUT_MS || 15000);
const PLAN_TOKEN_SECRET = process.env.VTU_PLAN_TOKEN_SECRET || process.env.AUTH_SECRET;
const PLAN_TOKEN_TTL_SECONDS = 15 * 60;

class ProviderError extends Error {
    constructor(message, { provider, code, requestId, fallbackEligible = false, retryable = true } = {}) {
        super(message);
        this.name = "ProviderError";
        this.provider = provider;
        this.code = code;
        this.requestId = requestId;
        this.fallbackEligible = fallbackEligible;
        this.retryable = retryable;
    }
}

function providerRequestOptions(options = {}) {
    return {
        ...options,
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS)
    };
}

function assertConfigured() {
    if (VTU_GATE_ONLY) {
        if (!isVtuGateConfigured()) throw new Error("VTU Gate is selected but VTU_GATE_API_KEY is not configured");
        return;
    }
    if (isVtuGateConfigured()) return;
    if (!PROVIDER_URL || !PROVIDER_API_KEY) {
        throw new Error("VTU_PROVIDER_URL and VTU_PROVIDER_API_KEY must be configured");
    }
}

function isSmeplugConfigured() {
    return Boolean(PROVIDER_URL && PROVIDER_API_KEY);
}


function encodePlanToken(plan) {
    if (!PLAN_TOKEN_SECRET) throw new Error("AUTH_SECRET must be configured for VTU plan tokens");
    const payload = Buffer.from(JSON.stringify({
        provider: plan.provider,
        network: plan.network,
        code: plan.providerCode,
        serviceId: plan.serviceId,
        price: plan.price,
        providerPrice: plan.providerPrice,
        expiresAt: Math.floor(Date.now() / 1000) + PLAN_TOKEN_TTL_SECONDS
    })).toString("base64url");
    const signature = crypto.createHmac("sha256", PLAN_TOKEN_SECRET).update(payload).digest("base64url");
    return `${payload}.${signature}`;
}

function resolvePlanToken(token, network) {
    if (!PLAN_TOKEN_SECRET || typeof token !== "string") return { error: "Choose a valid data plan" };
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return { error: "Choose a valid data plan" };
    const expected = crypto.createHmac("sha256", PLAN_TOKEN_SECRET).update(payload).digest("base64url");
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return { error: "Choose a valid data plan" };
    }
    try {
        const plan = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        const normalizedNetwork = typeof network === "string" ? network.trim().toUpperCase() : "";
        const planNetwork = typeof plan.network === "string" ? plan.network.trim().toUpperCase() : "";
        const planCode = typeof plan.code === "string" ? plan.code : typeof plan.providerCode === "string" ? plan.providerCode : "";
        const hasValidNetwork = !planNetwork || planNetwork === normalizedNetwork || planNetwork === "MOBILE";

        if (plan.expiresAt < Math.floor(Date.now() / 1000)
            || !hasValidNetwork
            || !["smeplug", "vtugate"].includes(plan.provider)
            || !planCode
            || !Number.isFinite(Number(plan.price))
            || (plan.providerPrice !== undefined && (!Number.isFinite(Number(plan.providerPrice)) || Number(plan.providerPrice) <= 0))) {
            return { error: "This data plan is no longer available" };
        }

        if (planNetwork && planNetwork !== normalizedNetwork && planNetwork !== "MOBILE") {
            return { error: "This data plan is not available for the selected network" };
        }

        plan.code = planCode;
        plan.providerCode = planCode;
        return { plan };
    } catch {
        return { error: "Choose a valid data plan" };
    }
}

function normalizeProviderResponse(payload, fallbackReference) {
    const success = payload?.status === "success"
        || payload?.status === true
        || payload?.success === true
        || payload?.data?.status === "success"
        || payload?.data?.status === true
        || payload?.data?.current_status === "success"
        || payload?.data?.current_status === true;

    if (!success) {
        const providerMessage = payload?.message
            || payload?.error
            || payload?.msg
            || payload?.data?.message
            || payload?.data?.error
            || payload?.data?.msg
            || payload?.data?.current_status
            || "VTU provider rejected the purchase";

        throw new Error(providerMessage);
    }

    const providerReference = String(
        payload?.reference
        || payload?.data?.reference
        || payload?.data?.provider_reference
        || payload?.provider_reference
        || payload?.data?.id
        || payload?.id
        || fallbackReference
    );

    return {
        providerReference,
        message: payload?.message
            || payload?.data?.message
            || payload?.data?.msg
            || "Purchase successful"
    };
}

function resolveNetworkKey(network, networkMap) {
    if (!network || !networkMap || typeof networkMap !== "object") return null;

    const normalizedNetwork = String(network).trim().toLowerCase().replace(/[^a-z0-9]/g, "");

    const aliasMatches = {
        "9mobile": ["9mobile", "t2", "10mobile"],
        "10mobile": ["9mobile", "t2", "10mobile"]
    };

    for (const [key, name] of Object.entries(networkMap)) {
        const currentName = String(name).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        const aliases = aliasMatches[normalizedNetwork] || [normalizedNetwork];

        if (currentName === normalizedNetwork || aliases.includes(currentName) || currentName === key) {
            return key;
        }
    }

    return null;
}

function normalizePlansPayload(payload, { network, networkMap, provider } = {}) {
    const candidates = [];

    function collect(candidate) {
        if (Array.isArray(candidate)) {
            candidates.push(candidate);
            return;
        }

        if (candidate && typeof candidate === "object") {
            Object.values(candidate).forEach((value) => collect(value));
        }
    }

    if (payload && payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
        const targetKey = resolveNetworkKey(network, networkMap || payload.networks || payload.data);
        const keyedCandidates = Object.entries(payload.data).filter(([, value]) => Array.isArray(value));

        if (targetKey) {
            const selected = keyedCandidates.find(([key]) => key === targetKey);
            if (selected) {
                candidates.push(selected[1]);
            }
        } else {
            keyedCandidates.forEach(([, value]) => candidates.push(value));
        }
    } else {
        collect(payload);
    }

    const items = candidates.flatMap((candidate) => candidate || []);
    if (items.length === 0) return [];

    const normalized = items.map((item, index) => {
        const raw = item && typeof item === "object" ? item : {};
        const code = raw.plan_code || raw.planCode || raw.variation_code || raw.code || raw.slug || raw.id || raw.name || `${index}`;
        const label = raw.name || raw.label || raw.title || raw.plan_name || raw.plan || raw.description || raw.code || code;
        const price = Number(
            raw.variation_amount
            ?? raw.amount
            ?? raw.price
            ?? raw.amount_naira
            ?? raw.price_naira
            ?? raw.cost
            ?? raw.value
            ?? raw.plan_price
            ?? 0
        );

        return {
            code: String(code),
            label: String(label),
            price: Number.isFinite(price) ? price : 0,
            network: raw.network || raw.provider || raw.operator || network || null,
            planType: raw.plan_type || raw.planType || raw.type || null,
            provider,
            providerCode: String(code)
        };
    }).filter((item) => item.label && item.price >= 0);

    const unique = new Map();
    for (const item of normalized) {
        const key = `${item.code}|${item.label}|${item.price}`;
        if (!unique.has(key)) unique.set(key, item);
    }

    return Array.from(unique.values());
}

async function getProviderNetworks() {
    assertConfigured();

    const response = await fetch(`${PROVIDER_URL.replace(/\/$/, "")}/networks`, providerRequestOptions({
        method: "GET",
        headers: {
            Authorization: `Bearer ${PROVIDER_API_KEY}`,
            "Content-Type": "application/json"
        }
    }));

    if (!response.ok) return {};

    const payload = await response.json().catch(() => ({}));
    return payload?.networks || {};
}

async function getVtuGateAccountDetails() {
    if (!VTU_GATE_BASE_URL || !VTU_GATE_API_KEY) {
        throw new Error("VTU_GATE_BASE_URL and VTU_GATE_API_KEY must be configured");
    }

    const response = await fetch(`${VTU_GATE_BASE_URL.replace(/\/$/, "")}/accountdetails`, providerRequestOptions({
        method: "POST",
        headers: {
            Authorization: `Bearer ${VTU_GATE_API_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams()
    }));
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.status !== true) {
        throw new Error(payload?.message || "Could not load VTU Gate account details");
    }

    return payload.data || {};
}

function isVtuGateConfigured() {
    return Boolean(VTU_GATE_BASE_URL && VTU_GATE_API_KEY);
}

function isVtuGateOnly() {
    return VTU_GATE_ONLY;
}

function normalizeNetworkName(value) {
    return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizePlanType(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized.includes("sme")) return "sme";
    if (normalized.includes("gift") || normalized.includes("corp")) return "gifting";
    return "general";
}

async function getVtuGateServiceId(network, serviceType) {
    const response = await VTU_GATE_PROVIDER.fetchAllServices();
    const normalizedNetwork = normalizeNetworkName(network);
    const aliases = {
        aedc: ["aedc"],
        ekedc: ["ekedc"],
        eedc: ["eedc", "enugu"],
        ibedc: ["ibedc", "ibadan"],
        ikedc: ["ikedc"],
        jed: ["jed", "jos"],
        kaedco: ["kaedco", "kaduna"],
        kedco: ["kedco"],
        phed: ["phed", "portharcourt"]
    };
    const acceptedNames = aliases[normalizedNetwork] || [normalizedNetwork];
    const service = (response.data || []).find((item) => item.service_type === serviceType
        && acceptedNames.includes(normalizeNetworkName(item.network_name || item.disco)));
    if (!service) throw new Error(`VTU Gate has no ${serviceType} service for ${network}`);
    return Number(service.service_id);
}

async function getVtuGateElectricityPlans({ provider, meterType } = {}) {
    const serviceId = await getVtuGateServiceId(provider, "electricity");
    return [{
        label: meterType === "postpaid" ? "Postpaid electricity" : "Prepaid electricity",
        price: 0,
        code: `${serviceId}:${meterType === "postpaid" ? "postpaid" : "prepaid"}`,
        category: meterType === "postpaid" ? "Postpaid" : "Prepaid",
        selectionToken: encodePlanToken({
            provider: "vtugate",
            network: provider,
            providerCode: `${serviceId}:${meterType === "postpaid" ? "postpaid" : "prepaid"}`,
            serviceId,
            price: 0
        })
    }];
}

async function getVtuGateCableServiceId(provider) {
    const response = await VTU_GATE_PROVIDER.fetchAllServices();
    const names = { dstv: "dstv", gotv: "gotv", startimes: "startimes" };
    const target = names[String(provider || "").toLowerCase()];
    const service = (response.data || []).find((item) => item.service_type === "tv"
        && normalizeNetworkName(item.tv_name) === target);
    if (!service) throw new Error(`VTU Gate has no cable service for ${provider}`);
    return Number(service.service_id);
}

async function getVtuGateCablePlans({ provider, smartcardNumber, phone }) {
    if (!/^\d{10}$/.test(String(smartcardNumber || ""))) throw new Error("Enter a valid smartcard number first");
    const serviceId = await getVtuGateCableServiceId(provider);
    const response = await VTU_GATE_PROVIDER.verifyCableTv({ serviceId, phone, smartcardNumber });
    return (response.data?.cable_plans || []).map((plan) => ({
        label: plan.name,
        price: Number(plan.price),
        code: `${serviceId}:${plan.code}:${encodeURIComponent(plan.name)}`,
        category: "Cable TV",
        selectionToken: encodePlanToken({
            provider: "vtugate",
            network: provider,
            providerCode: `${serviceId}:${plan.code}:${encodeURIComponent(plan.name)}`,
            serviceId,
            price: Number(plan.price)
        })
    }));
}

function normalizeVtuGateCustomerName(payload) {
    const containers = [
        payload?.data?.customer,
        payload?.data?.customer_details,
        payload?.data?.customerDetails,
        payload?.data?.customer_data,
        payload?.data?.customerData,
        payload?.data,
        payload?.customer,
        payload?.customer_details,
        payload?.customerDetails,
        payload?.result,
        payload?.content,
        payload
    ];
    const fields = [
        "smartcard_name",
        "smartcardName",
        "smartcardname",
        "customer_name",
        "customerName",
        "customername",
        "customer_full_name",
        "customerFullName",
        "full_name",
        "fullName",
        "account_name",
        "accountName",
        "name"
    ];

    for (const container of containers) {
        if (typeof container === "string" && container.trim()) return container.trim();
        if (!container || typeof container !== "object") continue;
        for (const field of fields) {
            const value = container[field];
            if (typeof value === "string" && value.trim()) return value.trim();
        }
    }

    return "";
}

async function verifyVtuGateCable({ provider, smartcardNumber, phone }) {
    const serviceId = await getVtuGateCableServiceId(provider);
    const response = await VTU_GATE_PROVIDER.verifyCableTv({ serviceId, phone, smartcardNumber });
    return {
        provider: "vtugate",
        customerName: normalizeVtuGateCustomerName(response),
        plans: (response.data?.cable_plans || []).map((plan) => ({
            label: plan.name,
            price: Number(plan.price),
            code: `${serviceId}:${plan.code}:${encodeURIComponent(plan.name)}`,
            category: "Cable TV",
            selectionToken: encodePlanToken({
                provider: "vtugate",
                network: provider,
                providerCode: `${serviceId}:${plan.code}:${encodeURIComponent(plan.name)}`,
                serviceId,
                price: Number(plan.price)
            })
        }))
    };
}

async function verifyVtuGateElectricity({ provider, meterNo }) {
    const serviceId = await getVtuGateServiceId(provider, "electricity");
    const response = await VTU_GATE_PROVIDER.verifyElectricity({ serviceId, meterNo, disco: provider });
    const data = response.data || {};
    return {
        provider: "vtugate",
        customerName: String(data.customer_name || data.customerName || data.name || ""),
        customerAddress: String(data.customer_address || data.customerAddress || data.address || "")
    };
}

async function getVtuGatePlans({ network, planType } = {}) {
    const servicesResponse = await VTU_GATE_PROVIDER.fetchAllServices();
    const normalizedNetwork = normalizeNetworkName(network);
    const targetType = normalizePlanType(planType);
    const services = (servicesResponse.data || []).filter((service) => service.service_type === "data"
        && normalizeNetworkName(service.network_name) === normalizedNetwork
        && (!planType || normalizePlanType(service.data_type) === targetType));

    const results = await Promise.allSettled(services.map(async (service) => {
        const response = await VTU_GATE_PROVIDER.fetchDataPlans({ serviceId: service.service_id });
        const plans = response.data?.data_plans || [];
        return plans.map((plan) => ({
            label: plan.name,
            price: Number(plan.price),
            planType: service.data_type,
            provider: "vtugate",
            providerCode: `${service.service_id}:${plan.code}`
        }));
    }));
    const plans = results.flatMap((result) => result.status === "fulfilled" ? result.value : [])
        .filter((plan) => plan.label && Number.isFinite(plan.price) && plan.price > 0);
    if (plans.length === 0) throw new Error("Could not load VTU Gate data plans");
    return plans;
}

async function getPlans({ network, planType } = {}) {
    if (VTU_GATE_ONLY || isVtuGateConfigured()) {
        const cacheKey = `${String(network || "all").toUpperCase()}:${String(planType || "all").toUpperCase()}`;
        const cached = vtuPlanCache.get(cacheKey);
        if (cached && Date.now() - cached.createdAt < VTU_PLAN_CACHE_TTL_MS) return cached.plans;
        const plans = await getVtuGatePlans({ network, planType });
        const normalizedPlans = plans.map((plan) => ({
            label: plan.label,
            price: plan.price,
            code: plan.providerCode,
            category: plan.planType,
            provider: plan.provider,
            selectionToken: encodePlanToken(plan)
        }));
        vtuPlanCache.set(cacheKey, { createdAt: Date.now(), plans: normalizedPlans });
        return normalizedPlans;
    }

    assertConfigured();
    const requests = [];
    if (isSmeplugConfigured()) requests.push(getSmeplugPlans({ network, planType }));
    const results = await Promise.allSettled(requests);
    const plans = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    if (plans.length === 0) throw new Error("Could not load data plans");
    return plans.map((plan) => ({
        label: plan.label,
        price: plan.price,
        code: plan.providerCode,
        category: plan.planType,
        provider: plan.provider,
        selectionToken: encodePlanToken(plan)
    }));
}

async function getSmeplugPlans({ network, planType } = {}) {
    const providerNetworks = await getProviderNetworks().catch(() => ({}));
    const base = PROVIDER_URL.replace(/\/$/, "");
    const urls = [
        { url: `${base}/data/plans`, withParams: false },
        { url: `${base}/plans`, withParams: true },
        { url: `${base}/data-plans`, withParams: true },
        { url: `${base}/products`, withParams: true }
    ];
    const headers = { Authorization: `Bearer ${PROVIDER_API_KEY}`, "Content-Type": "application/json" };
    for (const entry of urls) {
        try {
            const requestUrl = new URL(entry.url);
            if (entry.withParams && network) {
                requestUrl.searchParams.set("network", network);
                requestUrl.searchParams.set("operator", network);
            }
            if (entry.withParams && planType) {
                requestUrl.searchParams.set("planType", planType);
                requestUrl.searchParams.set("type", planType);
                requestUrl.searchParams.set("plan_type", planType);
            }
            const response = await fetch(requestUrl, providerRequestOptions({ method: "GET", headers }));
            const payload = await response.json().catch(() => ({}));
            if (response.ok) {
                const plans = normalizePlansPayload(payload, { network, networkMap: providerNetworks, provider: "smeplug" });
                if (plans.length > 0) return plans;
            }
        } catch { /* Try the next SMEPlug plan endpoint. */ }
    }
    throw new Error("Could not load SMEPlug data plans");
}

function resolveNetworkId(network, networkMap) {
    if (!network || !networkMap || typeof networkMap !== "object") return null;

    const normalizedNetwork = String(network).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const alternateNames = {
        "9mobile": ["9mobile", "t2", "10mobile"],
        "10mobile": ["9mobile", "t2", "10mobile"]
    };

    for (const [networkId, providerName] of Object.entries(networkMap)) {
        const currentName = String(providerName).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        const aliases = alternateNames[normalizedNetwork] || [normalizedNetwork];

        if (currentName === normalizedNetwork || aliases.includes(currentName) || currentName === networkId) {
            return Number(networkId);
        }
    }

    return null;
}

async function purchase({ type, network, phone, amount, planCode, provider, reference }) {
    assertConfigured();

    if (VTU_GATE_ONLY) {
        if (provider && provider !== "vtugate") {
            throw new ProviderError("Only VTU Gate is enabled. Reload the service plans and try again.", { provider: "vtugate", retryable: false });
        }
        return purchaseWithVtuGate({ type, network, phone, amount, planCode, reference });
    }

    if (type === "airtime" && isVtuGateConfigured()) return purchaseWithVtuGate({ type, network, phone, amount, planCode, reference });
    if (type === "airtime") return purchaseWithSmeplug({ type, network, phone, amount, planCode, reference });
    if (provider === "vtugate") return purchaseWithVtuGate({ type, network, phone, amount, planCode, reference });
    if (provider === "smeplug") return purchaseWithSmeplug({ type, network, phone, amount, planCode, reference });

    const providers = [PRIMARY_PROVIDER].filter((provider) => provider === "smeplug" ? isSmeplugConfigured() : provider === "vtugate" ? isVtuGateConfigured() : false);
    if (["smeplug", "vtugate"].includes(FALLBACK_PROVIDER) && FALLBACK_PROVIDER !== PRIMARY_PROVIDER
        && (FALLBACK_PROVIDER !== "smeplug" || isSmeplugConfigured())
        && (FALLBACK_PROVIDER !== "vtugate" || isVtuGateConfigured())) {
        providers.push(FALLBACK_PROVIDER);
    }
    if (providers.length === 0) throw new ProviderError("No VTU provider is configured", { retryable: false });
    let lastError;

    for (const provider of providers) {
        try {
            if (provider === "smeplug") {
                return await purchaseWithSmeplug({ type, network, phone, amount, planCode, reference });
            }
            throw new ProviderError(`Unsupported VTU provider: ${provider}`, { provider, retryable: false });
        } catch (error) {
            lastError = error;
            if (!(error instanceof ProviderError) || !error.fallbackEligible || providers[providers.length - 1] === provider) {
                throw error;
            }
        }
    }

    throw lastError;
}

async function purchaseWithVtuGate({ type, network, phone, amount, planCode, reference, meterNumber, smartcardNumber }) {
    if (!isVtuGateConfigured()) {
        throw new ProviderError("VTU Gate is not configured", { provider: "vtugate", retryable: false });
    }

    let serviceId;
    let providerPlanCode = planCode;
    if (type === "data") {
        const separator = String(planCode || "").indexOf(":");
        if (separator <= 0) throw new ProviderError("VTU Gate data plan is missing its service ID", { provider: "vtugate", retryable: false });
        serviceId = Number(String(planCode).slice(0, separator));
        providerPlanCode = String(planCode).slice(separator + 1);
    } else if (type === "cable_tv") {
        const parts = String(planCode || "").split(":");
        const separator = parts.length >= 2 ? 1 : -1;
        if (separator <= 0) throw new ProviderError("VTU Gate cable plan is missing its service ID", { provider: "vtugate", retryable: false });
        serviceId = Number(parts[0]);
        providerPlanCode = parts[1];
        const planName = parts[2] ? decodeURIComponent(parts.slice(2).join(":")) : providerPlanCode;
        const response = await VTU_GATE_PROVIDER.buyCableTv({
            serviceId,
            phone,
            smartcardNumber: String(smartcardNumber || "").replace(/\D/g, ""),
            amount,
            planCode: providerPlanCode,
            planName
        });
        return {
            provider: "vtugate",
            providerRequestId: String(response.data?.transaction_id || reference),
            providerReference: String(response.data?.external_reference || response.data?.transaction_id || reference),
            message: response.message || "Cable TV purchase successful"
        };
    } else if (type === "electricity") {
        const separator = String(planCode || "").indexOf(":");
        if (separator <= 0) throw new ProviderError("VTU Gate electricity plan is missing its service ID", { provider: "vtugate", retryable: false });
        serviceId = Number(String(planCode).slice(0, separator));
        const meterNo = String(meterNumber || "").replace(/\D/g, "");
        return VTU_GATE_PROVIDER.buyElectricity({ serviceId, meterNo, disco: network, amount, phoneNumber: phone }).then((response) => ({
            provider: "vtugate",
            providerRequestId: String(response.data?.transaction_id || reference),
            providerReference: String(response.data?.external_reference || response.data?.transaction_id || reference),
            message: response.message || "Electricity purchase successful"
        }));
    } else if (type === "airtime") {
        serviceId = await getVtuGateServiceId(network, "airtime");
    } else {
        throw new ProviderError(`VTU Gate does not support ${type} in the current purchase flow`, { provider: "vtugate", retryable: false });
    }

    try {
        return await VTU_GATE_PROVIDER.purchase({
            type,
            serviceId,
            phone,
            amount,
            planCode: providerPlanCode,
            reference
        });
    } catch (error) {
        throw new ProviderError(error.message || "VTU Gate rejected the purchase", {
            provider: "vtugate",
            code: error.status,
            retryable: error.status >= 500 || !error.status
        });
    }
}

async function purchaseWithSmeplug({ type, network, phone, amount, planCode, reference }) {
    if (!PROVIDER_URL || !PROVIDER_API_KEY) {
        throw new ProviderError("SMEPlug is not configured", { provider: "smeplug", retryable: false });
    }

    const providerNetworks = await getProviderNetworks().catch(() => ({}));
    const endpoint = type === "data" ? "data/purchase" : "airtime/purchase";
    const networkId = resolveNetworkId(network, providerNetworks);

    const body = {
        network_id: networkId,
        phone,
        amount
    };

    if (type === "data") {
        body.plan_id = Number(planCode);
    }

    const response = await fetch(`${PROVIDER_URL.replace(/\/$/, "")}/${endpoint}`, providerRequestOptions({
        method: "POST",
        headers: {
            Authorization: `Bearer ${PROVIDER_API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": reference
        },
        body: JSON.stringify(body)
    }));
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new ProviderError(
            payload?.message
            || payload?.error
            || payload?.msg
            || payload?.data?.message
            || payload?.data?.error
            || payload?.data?.msg
            || "SMEPlug rejected the purchase",
            { provider: "smeplug", retryable: true }
        );
    }

    return {
        ...normalizeProviderResponse(payload, reference),
        provider: "smeplug",
        providerRequestId: reference
    };
}

function createReference(userId, type) {
    return `vtu_${type}_${userId}_${crypto.randomUUID()}`;
}

module.exports = { ProviderError, purchase, createReference, getPlans, verifyVtuGateCable, verifyVtuGateElectricity, getVtuGateElectricityPlans, getVtuGateAccountDetails, resolvePlanToken, encodePlanToken, isVtuGateOnly, normalizeVtuGateCustomerName };
