const crypto = require("crypto");

const GAFIAPAY_BASE_URL = (process.env.GAFIAPAY_BASE_URL || "https://api.gafiapay.com/api/v1/external").replace(/\/$/, "");

function buildFallbackDedicatedAccount(user) {
    const label = String(user?.username || "user").replace(/\s+/g, "-").slice(0, 20) || "user";
    const suffix = String(user?.id ?? Date.now()).padStart(6, "0");

    return {
        dedicatedAccountNumber: `DVA-${label.toUpperCase()}-${suffix}`,
        dedicatedAccountReference: `local_${String(user?.id ?? Date.now())}_${Date.now()}`
    };
}

function gafiapaySignature(body, timestamp, secretKey) {
    return crypto.createHmac("sha256", secretKey).update(`${JSON.stringify(body)}${timestamp}`).digest("hex");
}

async function createGafiapayAccount({ name, email, bvn, nin }) {
    const apiKey = process.env.GAFIAPAY_API_KEY;
    const secretKey = process.env.GAFIAPAY_SECRET_KEY;
    if (!apiKey || !secretKey) throw new Error("GafiaPay is not configured");

    const body = { name, email, ...(bvn ? { bvn } : { nin }) };
    const timestamp = Date.now();
    const response = await fetch(`${GAFIAPAY_BASE_URL}/account/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "x-signature": gafiapaySignature(body, timestamp, secretKey),
            "x-timestamp": String(timestamp)
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(Number(process.env.GAFIAPAY_TIMEOUT_MS || 15000))
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.status !== "success") {
        throw new Error(payload.message || "GafiaPay account generation failed");
    }

    const account = payload.data || {};
    if (!/^\d{10}$/.test(String(account.accountNumber || ""))) {
        throw new Error("GafiaPay returned an invalid account number");
    }
    return {
        provider: "gafiapay",
        bankName: String(account.bankName || "Virtual Bank"),
        accountNumber: String(account.accountNumber),
        accountName: String(account.accountName || name),
        providerReference: account.reference || account.id || null
    };
}

async function resolveDedicatedAccount(user) {
    if (!process.env.PAYSTACK_SECRET_KEY) {
        return buildFallbackDedicatedAccount(user);
    }

    return null;
}

module.exports = {
    buildFallbackDedicatedAccount,
    createGafiapayAccount,
    gafiapaySignature,
    resolveDedicatedAccount
};
