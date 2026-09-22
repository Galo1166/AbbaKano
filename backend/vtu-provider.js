const crypto = require("crypto");

const PROVIDER_URL = process.env.VTU_PROVIDER_URL;
const PROVIDER_API_KEY = process.env.VTU_PROVIDER_API_KEY;
const VTPASS_BASE_URL = process.env.VTPASS_BASE_URL;
const VTPASS_API_KEY = process.env.VTPASS_API_KEY;
const VTPASS_PUBLIC_KEY = process.env.VTPASS_PUBLIC_KEY;
const VTPASS_SECRET_KEY = process.env.VTPASS_SECRET_KEY;
const PRIMARY_PROVIDER = (process.env.VTU_PRIMARY_PROVIDER || (VTPASS_BASE_URL ? "vtpass" : "smeplug")).toLowerCase();
const FALLBACK_PROVIDER = (process.env.VTU_FALLBACK_PROVIDER || "smeplug").toLowerCase();
const VTPASS_FALLBACK_CODES = new Set((process.env.VTPASS_FALLBACK_CODES || "028").split(",").map((code) => code.trim()).filter(Boolean));
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
    if (VTPASS_BASE_URL && VTPASS_API_KEY && VTPASS_PUBLIC_KEY && VTPASS_SECRET_KEY) return;
    if (!PROVIDER_URL || !PROVIDER_API_KEY) {
        throw new Error("VTU_PROVIDER_URL and VTU_PROVIDER_API_KEY must be configured");
    }
}

function isVtpassConfigured() {
    return Boolean(VTPASS_BASE_URL && VTPASS_API_KEY && VTPASS_PUBLIC_KEY && VTPASS_SECRET_KEY);
}

function isSmeplugConfigured() {
    return Boolean(PROVIDER_URL && PROVIDER_API_KEY);
}

function vtpassHeaders(method) {
    return {
        "Content-Type": "application/json",
        "api-key": VTPASS_API_KEY,
        ...(method === "GET" ? { "public-key": VTPASS_PUBLIC_KEY } : { "secret-key": VTPASS_SECRET_KEY })
    };
}

function vtpassRequestId() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Lagos",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).formatToParts(new Date()).reduce((result, part) => {
        result[part.type] = part.value;
        return result;
    }, {});
    return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${crypto.randomUUID().replace(/-/g, "")}`;
}

function vtpassServiceId(network, type) {
    const normalized = String(network).toLowerCase().replace(/[^a-z0-9]/g, "");
    const serviceNetwork = normalized === "9mobile" ? "etisalat" : normalized;
    return type === "data" ? `${serviceNetwork}-data` : serviceNetwork;
}

function vtpassBillServiceId(service, provider) {
    const normalized = String(provider || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (service === "cable") return { dstv: "dstv", gotv: "gotv", startimes: "startimes" }[normalized] || null;
    if (service === "electricity") return {
        ikejaelectric: "ikeja-electric",
        ekoelectric: "eko-electric",
        abujadisco: "abuja-electric",
        portharcourtelectric: "phed",
        kedco: "kedco",
        jed: "jed"
    }[normalized] || null;
    return null;
}

function encodePlanToken(plan) {
    if (!PLAN_TOKEN_SECRET) throw new Error("AUTH_SECRET must be configured for VTU plan tokens");
    const payload = Buffer.from(JSON.stringify({
        provider: plan.provider,
        network: plan.network,
        code: plan.providerCode,
        price: plan.price,
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
        const hasValidNetwork = !planNetwork || planNetwork === normalizedNetwork || planNetwork === "MOBILE";

        if (plan.expiresAt < Math.floor(Date.now() / 1000)
            || !hasValidNetwork
            || !["vtpass", "smeplug"].includes(plan.provider)
            || typeof plan.code !== "string" || !Number.isFinite(Number(plan.price))) {
            return { error: "This data plan is no longer available" };
        }
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
            raw.amount
            || raw.price
            || raw.amount_naira
            || raw.price_naira
            || raw.cost
            || raw.value
            || raw.plan_price
            || raw.variation_amount
            || 0
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

async function getPlans({ network, planType } = {}) {
    assertConfigured();
    const requests = [];
    if (isVtpassConfigured()) requests.push(getVtpassPlans(network));
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

async function getVtpassServicePlans({ service, provider, meterType } = {}) {
    if (!isVtpassConfigured()) throw new Error("VTPass is not configured");
    const serviceId = vtpassBillServiceId(service, provider);
    if (!serviceId) throw new Error("Choose a supported bill provider");
    if (service === "electricity") {
        return [{
            label: meterType === "postpaid" ? "Postpaid electricity" : "Prepaid electricity",
            price: 0,
            code: meterType === "postpaid" ? "postpaid" : "prepaid",
            category: meterType === "postpaid" ? "Postpaid" : "Prepaid",
            selectionToken: encodePlanToken({ provider: "vtpass", network: provider, providerCode: meterType === "postpaid" ? "postpaid" : "prepaid", price: 0 })
        }];
    }
    const response = await fetch(`${VTPASS_BASE_URL.replace(/\/$/, "")}/service-variations?serviceID=${encodeURIComponent(serviceId)}`, providerRequestOptions({ method: "GET", headers: vtpassHeaders("GET") }));
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.response_description !== "000") throw new Error("Could not load cable plans");
    return normalizePlansPayload(payload?.content?.variations || payload?.content?.varations || [], { network: provider, provider: "vtpass" }).map((plan) => ({
        label: plan.label,
        price: plan.price,
        code: plan.providerCode,
        category: plan.planType,
        selectionToken: encodePlanToken(plan)
    }));
}

async function verifyVtpassCableCustomer({ provider, smartcardNumber }) {
    if (!isVtpassConfigured()) throw new Error("VTPass is not configured");
    const serviceId = vtpassBillServiceId("cable", provider);
    if (!serviceId) throw new Error("Choose a supported cable provider");

    const response = await fetch(`${VTPASS_BASE_URL.replace(/\/$/, "")}/merchant-verify`, providerRequestOptions({
        method: "POST",
        headers: vtpassHeaders("POST"),
        body: JSON.stringify({
            billersCode: smartcardNumber,
            serviceID: serviceId,
            type: "smartcard"
        })
    }));
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.code !== "000") {
        throw new Error(payload?.response_description || payload?.message || "Could not verify cable customer");
    }

    const content = payload.content || payload.data || {};
    return {
        customerName: String(content.Customer_Name || content.customer_name || content.name || "")
    };
}

async function getVtpassPlans(network) {
    if (!network) return [];
    const serviceId = vtpassServiceId(network, "data");
    const response = await fetch(`${VTPASS_BASE_URL.replace(/\/$/, "")}/service-variations?serviceID=${encodeURIComponent(serviceId)}`, providerRequestOptions({
        method: "GET",
        headers: vtpassHeaders("GET")
    }));
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.response_description !== "000") throw new Error("Could not load VTPass data plans");
    return normalizePlansPayload(payload?.content?.variations || payload?.content?.varations || [], { network, provider: "vtpass" });
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

    if (provider === "vtpass") return purchaseWithVtpass({ type, network, phone, amount, planCode, reference });
    if (provider === "smeplug") return purchaseWithSmeplug({ type, network, phone, amount, planCode, reference });

    const providers = [PRIMARY_PROVIDER].filter((provider) => provider === "vtpass" ? isVtpassConfigured() : provider === "smeplug" ? isSmeplugConfigured() : true);
    if (FALLBACK_PROVIDER && FALLBACK_PROVIDER !== PRIMARY_PROVIDER && (FALLBACK_PROVIDER !== "smeplug" || isSmeplugConfigured()) && (FALLBACK_PROVIDER !== "vtpass" || isVtpassConfigured())) {
        providers.push(FALLBACK_PROVIDER);
    }
    if (providers.length === 0) throw new ProviderError("No VTU provider is configured", { retryable: false });
    let lastError;

    for (const provider of providers) {
        try {
            if (provider === "vtpass") {
                return await purchaseWithVtpass({ type, network, phone, amount, planCode, reference });
            }
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

async function purchaseWithVtpass({ type, network, phone, amount, planCode, reference }) {
    if (!isVtpassConfigured()) {
        throw new ProviderError("VTPass is not configured", { provider: "vtpass", fallbackEligible: true });
    }

    const serviceId = ["airtime", "data"].includes(type)
        ? vtpassServiceId(network, type)
        : vtpassBillServiceId(type === "cable_tv" ? "cable" : "electricity", network);
    const requestId = vtpassRequestId();
    const body = {
        request_id: requestId,
        serviceID: serviceId,
        billersCode: phone,
        amount,
        phone
    };
    if (type === "data" || type === "electricity" || type === "cable_tv") body.variation_code = planCode;
    if (type === "cable_tv") body.subscription_type = "change";

    let response;
    try {
        response = await fetch(`${VTPASS_BASE_URL.replace(/\/$/, "")}/pay`, providerRequestOptions({
            method: "POST",
            headers: vtpassHeaders("POST"),
            body: JSON.stringify(body)
        }));
    } catch (error) {
        throw new ProviderError(error.message || "VTPass request failed", { provider: "vtpass", requestId });
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.code !== "000") {
        const code = String(payload?.code || response.status);
        throw new ProviderError(payload?.message || payload?.response_description || "VTPass rejected the purchase", {
            provider: "vtpass",
            code,
            requestId: payload?.requestId || requestId,
            fallbackEligible: response.ok && VTPASS_FALLBACK_CODES.has(code),
            retryable: !response.ok || !VTPASS_FALLBACK_CODES.has(code)
        });
    }

    return {
        provider: "vtpass",
        providerRequestId: payload?.requestId || requestId,
        providerReference: String(payload?.content?.transactions?.transactionId || payload?.requestId || reference),
        message: payload?.response_description || "Transaction successful"
    };
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

module.exports = { ProviderError, purchase, createReference, getPlans, getVtpassServicePlans, verifyVtpassCableCustomer, resolvePlanToken, isVtpassFallbackEligible: (code) => VTPASS_FALLBACK_CODES.has(String(code)) };
