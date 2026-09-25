
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { createClient } = require("redis");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const { purchase: purchaseVtu, createReference: createVtuReference, getPlans: getVtuPlans, getVtpassServicePlans, verifyVtpassCableCustomer, verifyVtuGateCable, verifyVtuGateElectricity, getVtuGateAccountDetails, resolvePlanToken } = require("./vtu-provider");
const { calculateCreditAmount, isVerifiedPaystackDeposit } = require("./transaction-state");
const { buildFallbackDedicatedAccount, createGafiapayAccount } = require("./dedicated-account");
const { awardReferralCommission } = require("./referral");
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse
} = require("@simplewebauthn/server");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const AUTH_SECRET = process.env.AUTH_SECRET;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL || "http://localhost:3000/payments/paystack/callback";
const PAYSTACK_FRONTEND_URL = process.env.PAYSTACK_FRONTEND_URL || "http://localhost:5173/";
const PAYSTACK_APP_CALLBACK_URL = process.env.PAYSTACK_APP_CALLBACK_URL || "abbakanodatasubapp://payment";
const WEBAUTHN_RP_ID = process.env.WEBAUTHN_RP_ID || (process.env.NODE_ENV === "production" ? "abbakano-1.onrender.com" : "localhost");
const WEBAUTHN_ORIGIN = process.env.WEBAUTHN_ORIGIN || (process.env.NODE_ENV === "production" ? "https://abbakano-1.onrender.com" : "http://localhost:5173");
const SESSION_COOKIE = "session";
const SECURE_COOKIES = process.env.SECURE_COOKIES === "true" || process.env.NODE_ENV === "production";
const COOKIE_SAME_SITE = SECURE_COOKIES ? "None" : "Lax";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\d{10,15}$/;
const PIN_PATTERN = /^\d{4}$/;
const VTU_NETWORKS = new Set(["MTN", "AIRTEL", "GLO", "9MOBILE"]);
const VTU_ELECTRICITY_NETWORKS = new Set(["AEDC", "EKEDC", "EEDC", "IBEDC", "IKEDC", "JED", "KAEDCO", "KEDCO", "PHED"]);
const VTU_RATE_LIMIT = Number(process.env.VTU_RATE_LIMIT || 10);
const VERIFIED_AGENT_RATE_LIMIT = Number(process.env.VERIFIED_AGENT_RATE_LIMIT || 120);
const VTU_RATE_WINDOW_SECONDS = Number(process.env.VTU_RATE_WINDOW_SECONDS || 60);
const VTU_DAILY_LIMIT_NAIRA = Number(process.env.VTU_DAILY_LIMIT_NAIRA || 100000);
const VTU_PHONE_DAILY_LIMIT = Number(process.env.VTU_PHONE_DAILY_LIMIT || 3);
const REDIS_URL = process.env.REDIS_URL;
const CORS_ORIGINS = new Set(
    (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:8081,http://localhost:8082")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
);

app.use("/admin-dashboard", express.static(path.join(__dirname, "admin")));

function toBase64Url(value) {
    return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value) {
    return Buffer.from(value, "base64url");
}

const redisClient = REDIS_URL ? createClient({ url: REDIS_URL }) : null;
if (redisClient) {
    redisClient.on("error", (error) => console.error("Redis client error", error));
}

async function sendRedisCommand(...args) {
    if (!redisClient.isOpen) await redisClient.connect();
    return redisClient.sendCommand(args);
}

function createRateLimitStore(prefix) {
    return redisClient
        ? new RedisStore({
            prefix,
            sendCommand: sendRedisCommand
        })
        : undefined;
}

const authRateLimitStore = createRateLimitStore("ratelimit:auth:");
const vtuRateLimitStore = createRateLimitStore("ratelimit:vtu:");

if (!AUTH_SECRET) {
    throw new Error("AUTH_SECRET must be configured");
}

app.use(express.json({
    limit: "20kb",
    verify: (req, res, buffer) => {
        req.rawBody = Buffer.from(buffer);
    }
}));
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (typeof origin === "string" && CORS_ORIGINS.has(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Vary", "Origin");
    }
    res.header("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token, Idempotency-Key, Authorization");
    res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    store: authRateLimitStore,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many authentication attempts. Try again later." }
});

const vtuRateLimiter = rateLimit({
    windowMs: VTU_RATE_WINDOW_SECONDS * 1000,
    limit: async (req) => {
        if (!req.session?.sub) return VTU_RATE_LIMIT;
        const result = await pool.query(
            "SELECT status FROM agent_profiles WHERE user_id = $1",
            [req.session.sub]
        );
        return result.rows[0]?.status === "verified" ? VERIFIED_AGENT_RATE_LIMIT : VTU_RATE_LIMIT;
    },
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => `user:${req.session?.sub || req.ip}`,
    store: vtuRateLimitStore,
    message: { message: "Too many VTU purchase attempts. Try again later." }
});

function normalizePhone(value) {
    const digits = typeof value === "string" ? value.replace(/[\s()+-]/g, "") : "";
    if (digits.startsWith("234") && digits.length === 13) return `0${digits.slice(3)}`;
    return digits;
}

function validateSignup(body) {
    if (!body || typeof body !== "object") {
        return { error: "A JSON object is required" };
    }

    const { fullName, phone, email, password, referralCode, pin } = body;
    if (typeof fullName !== "string" || typeof phone !== "string" || typeof password !== "string") {
        return { error: "Full name, phone, and password are required" };
    }

    const normalizedFullName = fullName.trim().replace(/\s+/g, " ");
    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (normalizedFullName.length < 2 || normalizedFullName.length > 120) {
        return { error: "Full name must be 2-120 characters" };
    }
    if (!PHONE_PATTERN.test(normalizedPhone)) {
        return { error: "Enter a valid phone number" };
    }
    if (normalizedEmail && (normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail))) {
        return { error: "Enter a valid email address" };
    }
    if (password.length < 8 || password.length > 128) {
        return { error: "Password must be 8-128 characters" };
    }
    const pinValidation = validateTransactionPin(pin);
    if (pinValidation.error) return { error: pinValidation.error };

    const normalizedReferralCode = typeof referralCode === "string" && referralCode.trim()
        ? normalizePhone(referralCode.trim())
        : null;
    if (normalizedReferralCode && !PHONE_PATTERN.test(normalizedReferralCode)) {
        return { error: "Referral code must be a valid Nigerian phone number" };
    }
    if (normalizedReferralCode === normalizedPhone) {
        return { error: "You cannot use your own phone number as a referral code" };
    }

    return {
        fullName: normalizedFullName,
        phone: normalizedPhone,
        email: normalizedEmail || null,
        password,
        pin: pinValidation.pin,
        referralCode: normalizedReferralCode
    };
}

function createSession(user) {
    return jwt.sign({ sub: String(user.id), username: user.username, role: user.role }, AUTH_SECRET, { expiresIn: "2h" });
}

function hashPin(pin, salt) {
    return crypto.scryptSync(pin, salt, 64).toString("hex");
}

function hashDeviceToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function validateTransactionPin(pin) {
    if (typeof pin !== "string" || !PIN_PATTERN.test(pin)) {
        return { error: "Enter a valid 4-digit transaction PIN" };
    }

    return { pin };
}

function requireSession(req, res, next) {
    const authorization = req.headers.authorization;
    const bearerToken = typeof authorization === "string" && authorization.startsWith("Bearer ")
        ? authorization.slice(7).trim()
        : "";
    const token = bearerToken || req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
    if (!token) return res.status(401).json({ message: "Authentication required" });

    try {
        req.session = jwt.verify(token, AUTH_SECRET);
        next();
    } catch {
        res.status(401).json({ message: "Authentication required" });
    }
}

async function requireDeviceCredential(req, res, next) {
    const authorization = req.headers.authorization;
    const token = typeof authorization === "string" && authorization.startsWith("Bearer ")
        ? authorization.slice(7).trim()
        : "";
    if (!token) return res.status(401).json({ message: "Device authentication required" });

    try {
        const result = await pool.query(
            `SELECT dc.id, dc.user_id, u.username, u.role, u.status
             FROM device_credentials dc
             JOIN users u ON u.id = dc.user_id
             WHERE dc.token_hash = $1`,
            [hashDeviceToken(token)]
        );
        const credential = result.rows[0];
        if (!credential || credential.status !== "active") {
            return res.status(401).json({ message: "Device authentication required" });
        }
        await pool.query("UPDATE device_credentials SET last_used_at = NOW() WHERE id = $1", [credential.id]);
        req.session = { sub: String(credential.user_id), username: credential.username, role: credential.role };
        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Could not authenticate device" });
    }
}

async function requireAdmin(req, res, next) {
    try {
        const result = await pool.query("SELECT role FROM users WHERE id = $1", [req.session.sub]);
        if (result.rows[0]?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Could not verify admin access" });
    }
}

function setSessionCookie(res, user) {
    const secure = SECURE_COOKIES ? "; Secure" : "";
    const token = createSession(user);
    res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=7200; SameSite=${COOKIE_SAME_SITE}${secure}`);
    return token;
}

function setCsrfCookie(res) {
    const secure = SECURE_COOKIES ? "; Secure" : "";
    const token = crypto.randomBytes(32).toString("hex");
    res.append("Set-Cookie", `csrf=${token}; Path=/; Max-Age=7200; SameSite=${COOKIE_SAME_SITE}${secure}`);
    return token;
}

function getCsrfCookie(req) {
    return req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("csrf="))?.slice(5);
}

app.get("/csrf", (req, res) => {
    const token = getCsrfCookie(req) || setCsrfCookie(res);
    res.json({ csrfToken: token });
});

function requireCsrf(req, res, next) {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
    if (typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ")) {
        return next();
    }
    const cookie = req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("csrf="))?.slice(5);
    const header = req.headers["x-csrf-token"];
    if (!cookie || typeof header !== "string" || cookie.length !== header.length || !crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) {
        return res.status(403).json({ message: "CSRF validation failed" });
    }
    next();
}

async function audit(client, userId, transactionId, action, details = {}, req) {
    await client.query(
        `INSERT INTO audit_logs (user_id, transaction_id, action, details, ip_address)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, transactionId || null, action, details, req?.ip || null]
    );
}

async function recordFraudEvent(userId, operation, riskScore, reasons, req) {
    await pool.query(
        `INSERT INTO fraud_events (user_id, operation, risk_score, reason_codes, ip_address)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, operation, riskScore, reasons, req.ip || null]
    );
}

// All balance-affecting work for a deposit happens in the caller's SQL transaction.
// The conditional update also makes duplicate webhook deliveries harmless.
async function settleDeposit(client, deposit) {
    const creditAmountKobo = calculateCreditAmount(
        Number(deposit.amount_kobo),
        Number(deposit.fee_kobo || 0)
    );

    const updated = await client.query(
        `UPDATE deposits
         SET status = 'success',
             verified_at = COALESCE(verified_at, NOW()),
             credit_amount_kobo = COALESCE(credit_amount_kobo, $2),
             failure_reason = NULL
         WHERE id = $1 AND status = 'pending'
         RETURNING amount_kobo, fee_kobo, credit_amount_kobo`,
        [deposit.id, creditAmountKobo]
    );
    if (updated.rowCount !== 1) return false;

    const wallet = await client.query(
        `UPDATE wallets SET balance_kobo = balance_kobo + $1, updated_at = NOW()
         WHERE user_id = $2 RETURNING balance_kobo`,
        [updated.rows[0].credit_amount_kobo || creditAmountKobo, deposit.user_id]
    );
    if (wallet.rowCount !== 1) throw new Error("Wallet is missing for deposit user");
    await client.query(
        `INSERT INTO wallet_ledger (user_id, deposit_id, entry_type, amount_kobo, balance_after_kobo, idempotency_key)
         VALUES ($1, $2, 'deposit', $3, $4, $5)`,
        [deposit.user_id, deposit.id, updated.rows[0].credit_amount_kobo || creditAmountKobo, wallet.rows[0].balance_kobo, deposit.reference]
    );
    await audit(client, deposit.user_id, null, "deposit.settled", {
        reference: deposit.reference,
        amount: Number(updated.rows[0].credit_amount_kobo || creditAmountKobo) / 100,
        fee: Number(updated.rows[0].fee_kobo || 0) / 100
    });
    return true;
}

async function finalizeVtuSuccess(transactionId, userId, providerResult, response) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const updated = await client.query(
            `UPDATE vtu_transactions
             SET status = 'success', provider = $1, provider_request_id = $2, provider_reference = $3, completed_at = NOW(), failure_reason = NULL
             WHERE id = $4 AND status = 'pending'
             RETURNING id`,
            [providerResult.provider, providerResult.providerRequestId, providerResult.providerReference, transactionId]
        );
        if (updated.rowCount === 1) {
            await client.query("UPDATE wallet_reservations SET status = 'settled', resolved_at = NOW() WHERE transaction_id = $1 AND status = 'held'", [transactionId]);
            await client.query("UPDATE idempotency_keys SET status = 'success', response_json = $1, updated_at = NOW() WHERE transaction_id = $2", [response, transactionId]);
            await audit(client, userId, transactionId, "vtu.settled", { provider: providerResult.provider, providerReference: providerResult.providerReference });
        }
        await client.query("COMMIT");
        return updated.rowCount === 1;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function assessVtuRisk(userId, type, input, client) {
    const profile = await client.query(
        "SELECT status, daily_limit_kobo FROM agent_profiles WHERE user_id = $1",
        [userId]
    );
    const agent = profile.rows[0];
    if (agent?.status === "suspended") return { riskScore: 100, reasons: ["agent_suspended"], dailyCount: 0, type };
    const dailyLimitKobo = agent?.status === "verified" ? Number(agent.daily_limit_kobo) : VTU_DAILY_LIMIT_NAIRA * 100;
    const daily = await client.query(
        `SELECT COALESCE(SUM(amount_kobo), 0) AS total, COUNT(*)::int AS count
         FROM vtu_transactions
         WHERE user_id = $1 AND status IN ('pending', 'success')
           AND created_at >= NOW() - INTERVAL '24 hours'`,
        [userId]
    );
    const recent = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM vtu_transactions
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '10 minutes'`,
        [userId]
    );
    const phone = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM vtu_transactions
         WHERE user_id = $1 AND phone = $2 AND created_at >= NOW() - INTERVAL '24 hours'`,
        [userId, input.phone]
    );
    const dailyTotal = Number(daily.rows[0].total);
    const reasons = [];
    let riskScore = 0;
    if (dailyTotal + input.amount * 100 > dailyLimitKobo) {
        riskScore += 80;
        reasons.push("daily_spend_limit");
    }
    if (Number(recent.rows[0].count) >= 5) {
        riskScore += 50;
        reasons.push("velocity_10m");
    }
    if (Number(phone.rows[0].count) >= VTU_PHONE_DAILY_LIMIT) {
        riskScore += 40;
        reasons.push("phone_velocity");
    }
    if (input.amount >= 50000) {
        riskScore += 25;
        reasons.push("large_amount");
    }
    return { riskScore, reasons, dailyCount: Number(daily.rows[0].count), type };
}

function validateVtuRequest(body, type) {
    if (!body || typeof body !== "object") return { error: "A JSON object is required" };
    const { network, phone, amount, planCode, planToken, pin } = body;
    const normalizedPhone = typeof phone === "string" ? phone.replace(/[\s-]/g, "") : "";
    const pinValidation = validateTransactionPin(pin);
    if (pinValidation.error) return { error: pinValidation.error };
    const normalizedNetwork = typeof network === "string" ? network.trim().toUpperCase() : "";
    const validNetwork = type === "cable_tv"
        ? ["DSTV", "GOTV", "STARTIMES"].includes(normalizedNetwork)
        : type === "electricity"
            ? VTU_ELECTRICITY_NETWORKS.has(normalizedNetwork)
            : VTU_NETWORKS.has(normalizedNetwork);
    if (!validNetwork) return { error: "Choose a supported network" };
    if (!PHONE_PATTERN.test(normalizedPhone)) return { error: "Enter a valid phone number" };
    if (["airtime", "electricity"].includes(type) && (!Number.isInteger(amount) || amount < 50 || amount > 100000)) return { error: "Amount must be between 50 and 100,000 naira" };
    if (["data", "cable_tv", "electricity"].includes(type) && typeof planToken !== "string") return { error: "Choose a valid plan" };
    if (type === "data" && (typeof amount !== "number" || !Number.isFinite(amount))) return { error: "Choose a valid data plan" };
    return { network: type === "cable_tv" ? normalizedNetwork.toLowerCase() : normalizedNetwork, phone: normalizedPhone, amount, planCode: type === "data" ? planCode : null, planToken: type === "data" ? planToken : null, provider: null, pin: pinValidation.pin };
}

function getIdempotencyKey(req) {
    const key = req.headers["idempotency-key"];
    if (typeof key !== "string" || !/^[A-Za-z0-9._:-]{16,100}$/.test(key)) {
        return null;
    }
    return key;
}

function hashVtuRequest(input) {
    return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function storedVtuResponse(transaction) {
    return {
        status: transaction.status,
        reference: transaction.reference,
        providerReference: transaction.provider_reference,
        message: transaction.status === "success"
            ? "Purchase successful"
            : transaction.status === "failed"
                ? "Purchase failed"
                : "Purchase is being processed"
    };
}

async function executeVtuPurchase(req, res, type) {
    const input = validateVtuRequest(req.body, type);
    if (input.error) return res.status(400).json({ message: input.error });
    if (["data", "cable_tv", "electricity"].includes(type)) {
        const selection = resolvePlanToken(input.planToken, input.network);
        if (selection.error) return res.status(400).json({ message: selection.error });
        input.provider = selection.plan.provider;
        input.planCode = selection.plan.code;
        if (type !== "electricity") input.amount = Number(selection.plan.price);
        if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 100000) {
            return res.status(400).json({ message: "This data plan is not available" });
        }
    }
    const idempotencyKey = getIdempotencyKey(req);
    if (!idempotencyKey) {
        return res.status(400).json({ message: "A valid Idempotency-Key header is required" });
    }

    const userId = req.session.sub;
    const requestHash = hashVtuRequest(input);
    const reference = createVtuReference(userId, type);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const existingResult = await client.query(
            `SELECT reference, provider_reference, status, request_hash
             FROM vtu_transactions
             WHERE user_id = $1 AND type = $2 AND idempotency_key = $3
             FOR UPDATE`,
            [userId, type, idempotencyKey]
        );
        const existing = existingResult.rows[0];
        if (existing) {
            if (existing.request_hash !== requestHash) {
                await client.query("ROLLBACK");
                return res.status(409).json({ message: "Idempotency-Key was already used with different request data" });
            }
            await client.query("COMMIT");
            if (existing.status === "success") return res.status(200).json(storedVtuResponse(existing));
            if (existing.status === "failed") return res.status(409).json(storedVtuResponse(existing));
            return res.status(202).json(storedVtuResponse(existing));
        }

        const userPinResult = await client.query(
            `SELECT transaction_pin_hash, transaction_pin_salt
             FROM users
             WHERE id = $1`,
            [userId]
        );
        if (!userPinResult.rows[0]?.transaction_pin_hash) {
            await client.query("ROLLBACK");
            return res.status(400).json({ message: "Set a 4-digit transaction PIN first before making a purchase" });
        }

        const expectedPinHash = hashPin(input.pin, userPinResult.rows[0].transaction_pin_salt);
        if (expectedPinHash !== userPinResult.rows[0].transaction_pin_hash) {
            await client.query("ROLLBACK");
            return res.status(403).json({ message: "Incorrect transaction PIN" });
        }

        const keyResult = await client.query(
            `SELECT status, request_hash, response_json
             FROM idempotency_keys
             WHERE user_id = $1 AND operation = $2 AND idempotency_key = $3
             FOR UPDATE`,
            [userId, `vtu.${type}`, idempotencyKey]
        );
        const keyRecord = keyResult.rows[0];
        if (keyRecord) {
            await client.query("COMMIT");
            if (keyRecord.request_hash !== requestHash) return res.status(409).json({ message: "Idempotency-Key was already used with different request data" });
            if (keyRecord.response_json) return res.status(keyRecord.status === "success" ? 200 : 202).json(keyRecord.response_json);
            return res.status(202).json({ status: "pending", message: "Purchase is being processed" });
        }

        const risk = await assessVtuRisk(userId, type, input, client);
        if (risk.riskScore >= 80) {
            await client.query("ROLLBACK");
            await recordFraudEvent(userId, `vtu.${type}`, risk.riskScore, risk.reasons, req);
            return res.status(429).json({
                message: "This purchase was blocked by transaction risk controls",
                code: "FRAUD_REVIEW_REQUIRED"
            });
        }
        await client.query(
            `INSERT INTO idempotency_keys (user_id, operation, idempotency_key, request_hash, status)
             VALUES ($1, $2, $3, $4, 'processing')`,
            [userId, `vtu.${type}`, idempotencyKey, requestHash]
        );

        const inserted = await client.query(
            `INSERT INTO vtu_transactions
                     (user_id, reference, type, network, phone, plan_code, amount_kobo, provider, idempotency_key, request_hash)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (user_id, type, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
             RETURNING id`,
            [userId, reference, type, input.network, input.phone, input.planCode, Math.round(input.amount * 100), input.provider, idempotencyKey, requestHash]
        );
        if (inserted.rowCount !== 1) {
            const concurrent = await client.query(
                `SELECT reference, provider_reference, status, request_hash
                 FROM vtu_transactions
                 WHERE user_id = $1 AND type = $2 AND idempotency_key = $3`,
                [userId, type, idempotencyKey]
            );
            await client.query("COMMIT");
            const transaction = concurrent.rows[0];
            if (!transaction || transaction.request_hash !== requestHash) {
                return res.status(409).json({ message: "Idempotency-Key conflict" });
            }
            if (transaction.status === "success") return res.status(200).json(storedVtuResponse(transaction));
            if (transaction.status === "failed") return res.status(409).json(storedVtuResponse(transaction));
            return res.status(202).json(storedVtuResponse(transaction));
        }
        const wallet = await client.query(
            `UPDATE wallets SET balance_kobo = balance_kobo - $1, updated_at = NOW()
             WHERE user_id = $2 AND balance_kobo >= $1
             RETURNING balance_kobo`,
            [input.amount * 100, userId]
        );
        if (wallet.rowCount !== 1) {
            await client.query("ROLLBACK");
            return res.status(402).json({ message: "Insufficient wallet balance" });
        }
        await client.query(
            `INSERT INTO wallet_ledger (user_id, transaction_id, entry_type, amount_kobo, balance_after_kobo, idempotency_key)
             VALUES ($1, $2, 'reservation', $3, $4, $5)`,
            [userId, inserted.rows[0].id, -(input.amount * 100), wallet.rows[0].balance_kobo, idempotencyKey]
        );
        await client.query(
            "INSERT INTO wallet_reservations (transaction_id, user_id, amount_kobo) VALUES ($1, $2, $3)",
            [inserted.rows[0].id, userId, input.amount * 100]
        );
        await audit(client, userId, inserted.rows[0].id, "vtu.funds_reserved", { amount: input.amount, type }, req);
        await client.query(
            `UPDATE idempotency_keys SET status = 'pending', transaction_id = $1, updated_at = NOW()
             WHERE user_id = $2 AND operation = $3 AND idempotency_key = $4`,
            [inserted.rows[0].id, userId, `vtu.${type}`, idempotencyKey]
        );
        await client.query("COMMIT");

        try {
            const providerResult = await purchaseVtu({ ...input, type, reference });
            const response = { status: "success", reference, message: providerResult.message };
            await pool.query(
                "UPDATE vtu_transactions SET provider = $1, provider_request_id = $2 WHERE id = $3 AND status = 'pending'",
                [providerResult.provider, providerResult.providerRequestId, inserted.rows[0].id]
            );
            await finalizeVtuSuccess(inserted.rows[0].id, userId, providerResult, response);
            return res.status(201).json({ status: "success", reference, message: providerResult.message });
        } catch (providerError) {
            await pool.query(
                `UPDATE vtu_transactions
                 SET provider = COALESCE($1, provider),
                     provider_request_id = COALESCE($2, provider_request_id),
                     attempt_count = attempt_count + 1,
                     next_attempt_at = NOW() + INTERVAL '2 minutes'
                 WHERE id = $3 AND status = 'pending'`,
                [providerError.provider || input.provider, providerError.requestId || null, inserted.rows[0].id]
            );
            await pool.query("UPDATE idempotency_keys SET status = 'pending', updated_at = NOW() WHERE user_id = $1 AND operation = $2 AND idempotency_key = $3", [userId, `vtu.${type}`, idempotencyKey]);
            console.error(providerError);
            return res.status(202).json({ status: "pending", reference, message: "Purchase is being processed" });
        }
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        return res.status(500).json({ message: "Could not create VTU purchase" });
    } finally {
        client.release();
    }
}

async function paystackRequest(path, options = {}) {
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY is not configured");
    const response = await fetch(`https://api.paystack.co${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });
    const payload = await response.json();
    if (!response.ok || !payload.status) {
        throw new Error(payload.message || "Paystack request failed");
    }
    return payload.data;
}

async function createDedicatedAccount(user) {
    if (!PAYSTACK_SECRET_KEY) {
        return buildFallbackDedicatedAccount(user);
    }

    try {
        const account = await paystackRequest("/dedicated_account", {
            method: "POST",
            body: JSON.stringify({
                email: user.email,
                first_name: (user.full_name || user.username).split(" ")[0] || user.username,
                last_name: (user.full_name || user.username).split(" ").slice(1).join(" ") || "User",
                preferred_bank: process.env.PAYSTACK_DEDICATED_BANK || "wema-bank",
                metadata: { user_id: String(user.id), generated_by: "abbakano" }
            })
        });

        return {
            dedicatedAccountNumber: account.account_number || account.accountNumber,
            dedicatedAccountReference: account.reference || account.id
        };
    } catch (error) {
        console.warn("Paystack dedicated account provisioning failed, using local fallback:", error.message || error);
        return buildFallbackDedicatedAccount(user);
    }
}

app.get("/", (req, res) => {
    res.json({
        message: "Node.js API is working!"
    });
});

app.get("/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            message: "PostgreSQL connection successful!",
            time: result.rows[0].now
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Database connection failed"
        });
    }
});

app.post("/signup", authLimiter, async (req, res) => {
    const credentials = validateSignup(req.body);
    if (credentials.error) return res.status(400).json({ message: credentials.error });
    const { fullName, phone, email, password, pin, referralCode } = credentials;
    const username = `user_${phone}`;
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = crypto.scryptSync(password, salt, 64).toString("hex");
    const pinSalt = crypto.randomBytes(16).toString("hex");
    const pinHash = hashPin(pin, pinSalt);

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        let referrerUserId = null;
        if (referralCode) {
            const referrer = await client.query(
                `SELECT id
                 FROM users
                 WHERE phone = $1
                    OR regexp_replace(phone, '[^0-9]', '', 'g') = $1
                    OR regexp_replace(phone, '[^0-9]', '', 'g') = $2`,
                [referralCode, referralCode.startsWith("0") ? `234${referralCode.slice(1)}` : referralCode]
            );
            if (!referrer.rows[0]) {
                await client.query("ROLLBACK");
                return res.status(400).json({ message: "Referral phone number was not found" });
            }
            referrerUserId = referrer.rows[0].id;
        }
        const result = await client.query(
            `INSERT INTO users (username, full_name, phone, email, password_hash, transaction_pin_hash, transaction_pin_salt, referrer_user_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, username, full_name, phone, email, created_at`,
            [username, fullName, phone, email, `${salt}:${passwordHash}`, pinHash, pinSalt, referrerUserId]
        );

        const user = result.rows[0];
        if (referrerUserId) {
            await awardReferralCommission(client, referrerUserId, user.id, {
                amountKobo: 20000,
                reference: `referral_${referrerUserId}_${user.id}_${Date.now()}`
            });
        }

        await client.query(
            "INSERT INTO wallets (user_id, balance_kobo) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING",
            [user.id]
        );

        await client.query("COMMIT");

        const authToken = setSessionCookie(res, user);
        const csrfToken = setCsrfCookie(res);

        res.status(201).json({
            message: "Account created successfully",
            authToken,
            csrfToken,
            user
        });
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") {
            return res.status(409).json({ message: "Phone or email is already registered" });
        }

        console.error(error);
        res.status(500).json({ message: "Could not create account" });
    } finally {
        client.release();
    }
});

app.post("/password-reset/request", authLimiter, async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
        return res.status(400).json({ message: "Enter a valid email address" });
    }

    try {
        await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        res.status(202).json({ message: "If an account exists for that email, reset instructions will be sent shortly." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Could not process password reset request" });
    }
});

app.post("/login", authLimiter, async (req, res) => {
    const identifier = typeof req.body?.identifier === "string" ? req.body.identifier.trim() : "";
    const password = req.body?.password;
    const normalizedPhone = normalizePhone(identifier);
    const validIdentifier = PHONE_PATTERN.test(normalizedPhone)
        || EMAIL_PATTERN.test(identifier.toLowerCase())
        || /^[A-Za-z0-9_.-]{1,50}$/.test(identifier);
    if (!validIdentifier || typeof password !== "string" || password.length < 1 || password.length > 128) {
        return res.status(400).json({ message: "Enter a valid phone number or email and password" });
    }

    try {
        const result = await pool.query(
            "SELECT id, username, full_name, phone, email, password_hash, role, status FROM users WHERE phone = $1 OR email = $2 OR LOWER(username) = LOWER($3)",
            [normalizedPhone, identifier.toLowerCase(), identifier]
        );
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: "Invalid phone number or email and password" });
        }

        if (user.status !== "active") {
            return res.status(403).json({ message: "This account has been blocked by an administrator" });
        }

        const [salt, storedHash] = user.password_hash.split(":");
        const submittedHash = crypto.scryptSync(password, salt, 64).toString("hex");
        const hashesMatch = crypto.timingSafeEqual(
            Buffer.from(submittedHash, "hex"),
            Buffer.from(storedHash, "hex")
        );

        if (!hashesMatch) {
            return res.status(401).json({ message: "Invalid phone number or email and password" });
        }

        const authToken = setSessionCookie(res, user);
        const csrfToken = setCsrfCookie(res);

        res.json({
            message: "Login successful",
            authToken,
            csrfToken,
            user: { id: user.id, fullName: user.full_name, phone: user.phone, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Could not log in" });
    }
});

app.post("/auth/device/register", requireSession, requireCsrf, async (req, res) => {
    const platform = req.body?.platform === "ios" ? "ios" : "android";
    const token = crypto.randomBytes(32).toString("base64url");
    await pool.query(
        `INSERT INTO device_credentials (user_id, token_hash, platform)
         VALUES ($1, $2, $3)`,
        [req.session.sub, hashDeviceToken(token), platform]
    );
    res.status(201).json({ deviceToken: token });
});

app.delete("/auth/device", requireSession, requireCsrf, async (req, res) => {
    await pool.query("DELETE FROM device_credentials WHERE user_id = $1", [req.session.sub]);
    res.sendStatus(204);
});

app.post("/auth/device/login", requireDeviceCredential, async (req, res) => {
    const userResult = await pool.query(
        "SELECT id, username, full_name, phone, email, role FROM users WHERE id = $1",
        [req.session.sub]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(401).json({ message: "User account not found" });
    const authToken = setSessionCookie(res, user);
    const csrfToken = setCsrfCookie(res);
    res.json({ message: "Biometric login successful", authToken, csrfToken, user: { id: user.id, fullName: user.full_name, phone: user.phone, email: user.email, role: user.role } });
});

async function findUserByIdentifier(identifier) {
    const value = typeof identifier === "string" ? identifier.trim() : "";
    const phone = normalizePhone(value);
    const result = await pool.query(
        "SELECT id, username, full_name, phone, email, role, status FROM users WHERE phone = $1 OR email = $2",
        [phone, value.toLowerCase()]
    );
    return result.rows[0];
}

app.post("/auth/passkey/register/options", requireSession, requireCsrf, async (req, res) => {
    const userResult = await pool.query(
        "SELECT id, username, full_name, phone, email FROM users WHERE id = $1",
        [req.session.sub]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(401).json({ message: "Authentication required" });

    const existing = await pool.query("SELECT id, transports FROM passkey_credentials WHERE user_id = $1", [user.id]);
    const options = await generateRegistrationOptions({
        rpName: "AbbaKano Data Sub",
        rpID: WEBAUTHN_RP_ID,
        userID: Buffer.from(String(user.id)),
        userName: user.email || user.phone,
        userDisplayName: user.full_name || user.phone,
        attestationType: "none",
        excludeCredentials: existing.rows.map((credential) => ({
            id: credential.id,
            transports: credential.transports || []
        })),
        authenticatorSelection: {
            residentKey: "preferred",
            userVerification: "required"
        }
    });
    await pool.query(
        `INSERT INTO passkey_challenges (user_id, challenge, purpose, expires_at)
         VALUES ($1, $2, 'registration', NOW() + INTERVAL '5 minutes')
         ON CONFLICT (user_id) DO UPDATE SET challenge = EXCLUDED.challenge, purpose = EXCLUDED.purpose, expires_at = EXCLUDED.expires_at`,
        [user.id, options.challenge]
    );
    res.json(options);
});

app.post("/auth/passkey/register/verify", requireSession, requireCsrf, async (req, res) => {
    const challengeResult = await pool.query(
        `SELECT challenge FROM passkey_challenges
         WHERE user_id = $1 AND purpose = 'registration' AND expires_at > NOW()`,
        [req.session.sub]
    );
    const challenge = challengeResult.rows[0]?.challenge;
    if (!challenge) return res.status(400).json({ message: "Passkey registration expired" });

    try {
        const verification = await verifyRegistrationResponse({
            response: req.body,
            expectedChallenge: challenge,
            expectedOrigin: WEBAUTHN_ORIGIN,
            expectedRPID: WEBAUTHN_RP_ID
        });
        if (!verification.verified || !verification.registrationInfo) {
            return res.status(400).json({ message: "Passkey registration was not verified" });
        }
        const { credential } = verification.registrationInfo;
        await pool.query(
            `INSERT INTO passkey_credentials (id, user_id, public_key, counter, transports)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET public_key = EXCLUDED.public_key, counter = EXCLUDED.counter, transports = EXCLUDED.transports`,
            [credential.id, req.session.sub, toBase64Url(credential.publicKey), credential.counter, JSON.stringify(credential.transports || [])]
        );
        await pool.query("DELETE FROM passkey_challenges WHERE user_id = $1", [req.session.sub]);
        res.status(201).json({ message: "Passkey registered successfully" });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: "Could not verify passkey registration" });
    }
});

app.delete("/auth/passkey", requireSession, requireCsrf, async (req, res) => {
    await pool.query("DELETE FROM passkey_credentials WHERE user_id = $1", [req.session.sub]);
    res.sendStatus(204);
});

app.post("/auth/passkey/login/options", async (req, res) => {
    const userResult = await pool.query(
        "SELECT id, username, full_name, phone, email, role, status, biometrics_enabled FROM users WHERE phone = $1 OR email = $2",
        [normalizePhone(req.body?.identifier), String(req.body?.identifier || "").trim().toLowerCase()]
    );
    const user = userResult.rows[0];
    if (!user || user.status !== "active") return res.status(401).json({ message: "Account not found" });
    if (user.biometrics_enabled === false) return res.status(403).json({ message: "Biometric login is disabled" });
    const credentials = await pool.query("SELECT id, transports FROM passkey_credentials WHERE user_id = $1", [user.id]);
    if (credentials.rows.length === 0) return res.status(404).json({ message: "No passkey is registered for this account" });
    const options = await generateAuthenticationOptions({
        rpID: WEBAUTHN_RP_ID,
        userVerification: "required",
        allowCredentials: credentials.rows.map((credential) => ({
            id: credential.id,
            transports: credential.transports || []
        }))
    });
    await pool.query(
        `INSERT INTO passkey_challenges (user_id, challenge, purpose, expires_at)
         VALUES ($1, $2, 'authentication', NOW() + INTERVAL '5 minutes')
         ON CONFLICT (user_id) DO UPDATE SET challenge = EXCLUDED.challenge, purpose = EXCLUDED.purpose, expires_at = EXCLUDED.expires_at`,
        [user.id, options.challenge]
    );
    res.json({ ...options, userId: user.id });
});

app.post("/auth/passkey/login/verify", async (req, res) => {
    const userResult = await pool.query(
        "SELECT id, username, full_name, phone, email, role, status, biometrics_enabled FROM users WHERE phone = $1 OR email = $2",
        [normalizePhone(req.body?.identifier), String(req.body?.identifier || "").trim().toLowerCase()]
    );
    const user = userResult.rows[0];
    if (!user || user.status !== "active") return res.status(401).json({ message: "Account not found" });
    if (user.biometrics_enabled === false) return res.status(403).json({ message: "Biometric login is disabled" });
    const challengeResult = await pool.query(
        `SELECT challenge FROM passkey_challenges
         WHERE user_id = $1 AND purpose = 'authentication' AND expires_at > NOW()`,
        [user.id]
    );
    const challenge = challengeResult.rows[0]?.challenge;
    if (!challenge) return res.status(400).json({ message: "Passkey authentication expired" });
    const stored = await pool.query(
        "SELECT id, public_key, counter, transports FROM passkey_credentials WHERE id = $1 AND user_id = $2",
        [req.body?.response?.id, user.id]
    );
    const credential = stored.rows[0];
    if (!credential) return res.status(401).json({ message: "Passkey is not registered" });

    try {
        const verification = await verifyAuthenticationResponse({
            response: req.body.response,
            expectedChallenge: challenge,
            expectedOrigin: WEBAUTHN_ORIGIN,
            expectedRPID: WEBAUTHN_RP_ID,
            credential: {
                id: credential.id,
                publicKey: fromBase64Url(credential.public_key),
                counter: Number(credential.counter),
                transports: credential.transports || []
            }
        });
        if (!verification.verified) return res.status(401).json({ message: "Passkey authentication failed" });
        await pool.query("UPDATE passkey_credentials SET counter = $1 WHERE id = $2", [verification.authenticationInfo.newCounter, credential.id]);
        await pool.query("DELETE FROM passkey_challenges WHERE user_id = $1", [user.id]);
        const authToken = setSessionCookie(res, user);
        const csrfToken = setCsrfCookie(res);
        res.json({ message: "Passkey login successful", authToken, csrfToken, user: { id: user.id, fullName: user.full_name, phone: user.phone, email: user.email, role: user.role } });
    } catch (error) {
        console.error(error);
        res.status(401).json({ message: "Could not verify passkey" });
    }
});

app.get("/me", requireSession, async (req, res) => {
    const result = await pool.query(
        `SELECT u.id, u.username, u.full_name, u.phone, u.email, u.role, u.status,
            w.balance_kobo AS wallet_balance_kobo,
            COALESCE(rcb.balance_kobo, 0) AS referral_commission_balance_kobo,
            (SELECT COUNT(*)::int FROM users referred WHERE referred.referrer_user_id = u.id) AS referral_count,
            COALESCE((SELECT SUM(amount_kobo) FROM referral_commission_ledger
                      WHERE user_id = u.id AND entry_type = 'earned'), 0) AS referral_earnings_kobo,
            u.biometrics_enabled, u.app_lock_enabled,
            u.dedicated_account_number, u.dedicated_account_reference,
            u.virtual_account_provider, u.virtual_account_number, u.virtual_account_bank_name,
            u.virtual_account_name, u.virtual_account_status,
            u.virtual_account_error, u.virtual_account_created_at,
            u.transaction_pin_hash IS NOT NULL AS has_transaction_pin,
            ap.status AS agent_status, ap.daily_limit_kobo
         FROM users u
         JOIN wallets w ON w.user_id = u.id
         LEFT JOIN referral_commission_balances rcb ON rcb.user_id = u.id
         LEFT JOIN agent_profiles ap ON ap.user_id = u.id
         WHERE u.id = $1`,
        [req.session.sub]
    );
    if (!result.rows[0]) return res.status(401).json({ message: "Authentication required" });
    const user = result.rows[0];
    res.json({ user: {
        ...user,
        virtualAccount: user.virtual_account_number ? {
            provider: user.virtual_account_provider,
            bankName: user.virtual_account_bank_name,
            accountNumber: user.virtual_account_number,
            accountName: user.virtual_account_name,
            status: user.virtual_account_status,
            error: user.virtual_account_error,
            createdAt: user.virtual_account_created_at
        } : null,
        walletBalance: Number(user.wallet_balance_kobo) / 100,
        referralCommissionBalance: Number(user.referral_commission_balance_kobo) / 100,
        referralCount: Number(user.referral_count || 0),
        referralEarnings: Number(user.referral_earnings_kobo || 0) / 100
    } });
});

app.post("/me/virtual-account", requireSession, requireCsrf, async (req, res) => {
    const identityType = req.body?.identityType === "nin" ? "nin" : req.body?.identityType === "bvn" ? "bvn" : null;
    const identityValue = typeof req.body?.identityValue === "string" ? req.body.identityValue.replace(/\D/g, "") : "";
    if (!identityType || !/^\d{11}$/.test(identityValue)) {
        return res.status(400).json({ message: "Enter a valid 11-digit BVN or NIN" });
    }

    const userResult = await pool.query(
        `SELECT id, full_name, email, virtual_account_number, virtual_account_status
         FROM users WHERE id = $1`,
        [req.session.sub]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(401).json({ message: "Authentication required" });
    if (user.virtual_account_number && user.virtual_account_status === "active") {
        return res.json({ status: "active", message: "Virtual account already exists" });
    }

    await pool.query(
        `UPDATE users SET virtual_account_status = 'pending', virtual_account_error = NULL, updated_at = NOW() WHERE id = $1`,
        [user.id]
    );
    try {
        const account = await createGafiapayAccount({
            name: user.full_name,
            email: user.email,
            ...(identityType === "bvn" ? { bvn: identityValue } : { nin: identityValue })
        });
        await pool.query(
            `UPDATE users
             SET virtual_account_provider = $1,
                 virtual_account_number = $2,
                 virtual_account_bank_name = $3,
                 virtual_account_name = $4,
                 virtual_account_reference = $5,
                 virtual_account_status = 'active',
                 virtual_account_created_at = NOW(),
                 virtual_account_error = NULL,
                 updated_at = NOW()
             WHERE id = $6`,
            [account.provider, account.accountNumber, account.bankName, account.accountName, account.providerReference, user.id]
        );
        return res.status(201).json({ status: "active", virtualAccount: account });
    } catch (error) {
        await pool.query(
            `UPDATE users SET virtual_account_status = 'failed', virtual_account_error = $1, updated_at = NOW() WHERE id = $2`,
            [error.message || "Could not create virtual account", user.id]
        ).catch(() => {});
        console.error("GafiaPay account generation failed:", error.message || error);
        return res.status(502).json({ message: "Could not create your virtual account. Please try again." });
    }
});

app.patch("/me/security-settings", requireSession, requireCsrf, async (req, res) => {
    const updates = {};
    if (typeof req.body?.biometricsEnabled === "boolean") updates.biometrics_enabled = req.body.biometricsEnabled;
    if (typeof req.body?.appLockEnabled === "boolean") updates.app_lock_enabled = req.body.appLockEnabled;
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "Provide a security setting to update" });
    }

    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const assignments = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");
    values.push(req.session.sub);
    const result = await pool.query(
        `UPDATE users SET ${assignments}, updated_at = NOW()
         WHERE id = $${values.length}
         RETURNING biometrics_enabled, app_lock_enabled`,
        values
    );
    if (!result.rows[0]) return res.status(404).json({ message: "User not found" });
    res.json({
        biometricsEnabled: result.rows[0].biometrics_enabled,
        appLockEnabled: result.rows[0].app_lock_enabled
    });
});

app.post("/referrals/commission/withdraw", requireSession, requireCsrf, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const commission = await client.query(
            `SELECT balance_kobo
             FROM referral_commission_balances
             WHERE user_id = $1
             FOR UPDATE`,
            [req.session.sub]
        );
        const amountKobo = Number(commission.rows[0]?.balance_kobo || 0);
        if (amountKobo <= 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ message: "No referral commission is available to withdraw" });
        }

        const reference = `commission_${req.session.sub}_${crypto.randomUUID()}`;
        const wallet = await client.query(
            `UPDATE wallets
             SET balance_kobo = balance_kobo + $1, updated_at = NOW()
             WHERE user_id = $2
             RETURNING balance_kobo`,
            [amountKobo, req.session.sub]
        );
        if (wallet.rowCount !== 1) throw new Error("Wallet is missing for commission user");

        await client.query(
            `UPDATE referral_commission_balances
             SET balance_kobo = 0, updated_at = NOW()
             WHERE user_id = $1`,
            [req.session.sub]
        );
        await client.query(
            `INSERT INTO referral_commission_ledger (user_id, entry_type, amount_kobo, reference)
             VALUES ($1, 'withdrawal', $2, $3)`,
            [req.session.sub, amountKobo, reference]
        );
        await client.query(
            `INSERT INTO wallet_ledger (user_id, entry_type, amount_kobo, balance_after_kobo, idempotency_key)
             VALUES ($1, 'commission', $2, $3, $4)`,
            [req.session.sub, amountKobo, wallet.rows[0].balance_kobo, reference]
        );
        await client.query("COMMIT");
        res.json({
            reference,
            amount: amountKobo / 100,
            walletBalance: Number(wallet.rows[0].balance_kobo) / 100
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        res.status(500).json({ message: "Could not withdraw referral commission" });
    } finally {
        client.release();
    }
});

app.post("/me/transaction-pin", requireSession, async (req, res) => {
    const pinValidation = validateTransactionPin(req.body?.pin);
    if (pinValidation.error) return res.status(400).json({ message: pinValidation.error });

    const existing = await pool.query(
        "SELECT transaction_pin_hash, transaction_pin_salt FROM users WHERE id = $1",
        [req.session.sub]
    );
    const currentPin = req.body?.currentPin;
    if (existing.rows[0]?.transaction_pin_hash) {
        const currentPinValidation = validateTransactionPin(currentPin);
        if (currentPinValidation.error || hashPin(currentPinValidation.pin, existing.rows[0].transaction_pin_salt) !== existing.rows[0].transaction_pin_hash) {
            return res.status(401).json({ message: "Current PIN is incorrect" });
        }
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const pinHash = hashPin(pinValidation.pin, salt);

    await pool.query(
        `UPDATE users
         SET transaction_pin_salt = $1,
             transaction_pin_hash = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [salt, pinHash, req.session.sub]
    );

    res.json({ message: "Transaction PIN saved successfully" });
});

app.post("/me/transaction-pin/verify-current", requireSession, async (req, res) => {
    const pinValidation = validateTransactionPin(req.body?.pin);
    if (pinValidation.error) return res.status(400).json({ message: pinValidation.error });

    const result = await pool.query(
        "SELECT transaction_pin_hash, transaction_pin_salt FROM users WHERE id = $1",
        [req.session.sub]
    );
    const user = result.rows[0];
    if (!user?.transaction_pin_hash || hashPin(pinValidation.pin, user.transaction_pin_salt) !== user.transaction_pin_hash) {
        return res.status(401).json({ message: "Current PIN is incorrect" });
    }

    res.json({ verified: true });
});

app.post("/me/app-lock/verify", requireSession, async (req, res) => {
    const pinValidation = validateTransactionPin(req.body?.pin);
    if (pinValidation.error) return res.status(400).json({ message: pinValidation.error });
    const result = await pool.query(
        "SELECT transaction_pin_hash, transaction_pin_salt FROM users WHERE id = $1",
        [req.session.sub]
    );
    const user = result.rows[0];
    if (!user?.transaction_pin_hash || hashPin(pinValidation.pin, user.transaction_pin_salt) !== user.transaction_pin_hash) {
        return res.status(401).json({ message: "Incorrect app lock PIN" });
    }
    res.json({ unlocked: true });
});

app.post("/me/transaction-pin/reset", requireSession, async (req, res) => {
    const pinValidation = validateTransactionPin(req.body?.pin);
    if (pinValidation.error) return res.status(400).json({ message: pinValidation.error });

    const userResult = await pool.query(
        `SELECT transaction_pin_hash, transaction_pin_salt
         FROM users
         WHERE id = $1`,
        [req.session.sub]
    );

    if (!userResult.rows[0]?.transaction_pin_hash) {
        return res.status(400).json({ message: "No transaction PIN is currently set" });
    }

    const expectedPinHash = hashPin(pinValidation.pin, userResult.rows[0].transaction_pin_salt);
    if (expectedPinHash !== userResult.rows[0].transaction_pin_hash) {
        return res.status(403).json({ message: "Incorrect transaction PIN" });
    }

    await pool.query(
        `UPDATE users
         SET transaction_pin_salt = NULL,
             transaction_pin_hash = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [req.session.sub]
    );

    res.json({ message: "Transaction PIN reset successfully" });
});

app.get("/wallet", requireSession, async (req, res) => {
    const result = await pool.query(
        "SELECT balance_kobo FROM wallets WHERE user_id = $1",
        [req.session.sub]
    );
    if (!result.rows[0]) return res.status(401).json({ message: "Authentication required" });
    res.json({ balance: Number(result.rows[0].balance_kobo) / 100, currency: "NGN" });
});

app.get("/deposits", requireSession, async (req, res) => {
    const result = await pool.query(
        `SELECT reference, amount_kobo, status, created_at, verified_at
         FROM deposits
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [req.session.sub]
    );
    res.json({ deposits: result.rows.map((deposit) => ({
        ...deposit,
        amount: Number(deposit.amount_kobo) / 100,
        currency: "NGN"
    })) });
});

// Canonical history feed for the client.  It deliberately reads only the
// database records, never browser state, so refreshes cannot lose activity.
app.get("/transactions", requireSession, async (req, res) => {
    const result = await pool.query(
        `SELECT reference AS id, 'deposit' AS type, 'Wallet funding' AS label,
                amount_kobo, status, created_at
         FROM deposits
         WHERE user_id = $1
         UNION ALL
         SELECT reference AS id, type,
                INITCAP(type) || ' · ' || network || ' · ' || phone AS label,
                amount_kobo, status, created_at
         FROM vtu_transactions
         WHERE user_id = $1
          UNION ALL
          SELECT id::text AS id, 'commission' AS type,
              'Referral commission transferred to wallet' AS label,
              amount_kobo, 'success' AS status, created_at
          FROM wallet_ledger
          WHERE user_id = $1 AND entry_type = 'commission'
         ORDER BY created_at DESC
         LIMIT 100`,
        [req.session.sub]
    );
    res.json({ transactions: result.rows.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        label: transaction.label,
        amount: Number(transaction.amount_kobo) / 100,
        status: transaction.status,
        date: transaction.created_at,
        currency: "NGN"
    })) });
});

app.post("/agents/request", requireSession, requireCsrf, async (req, res) => {
    try {
        const result = await pool.query(
            `INSERT INTO agent_profiles (user_id, status, daily_limit_kobo)
             VALUES ($1, 'pending', 50000000)
             ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
             RETURNING status, daily_limit_kobo`,
            [req.session.sub]
        );
        res.status(201).json({ agent: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Could not create agent request" });
    }
});

// Admin API: all routes below require a signed user session and an admin role.
app.get("/admin/auth/me", requireSession, requireAdmin, async (req, res) => {
    const result = await pool.query(
        "SELECT id, username, full_name, email, role, status FROM users WHERE id = $1",
        [req.session.sub]
    );
    res.json({ admin: result.rows[0], permissions: ["dashboard.read", "users.manage", "transactions.read", "ledger.manage", "audit.read"] });
});

app.post("/admin/auth/logout", requireSession, requireAdmin, (req, res) => {
    res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=${COOKIE_SAME_SITE}`);
    res.sendStatus(204);
});

app.get("/admin/dashboard/summary", requireSession, requireAdmin, async (req, res) => {
    const result = await pool.query(`SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'user') AS users,
        (SELECT COUNT(*) FROM deposits WHERE status = 'success') AS deposits,
        (SELECT COALESCE(SUM(amount_kobo), 0) FROM deposits WHERE status = 'success') AS deposit_volume_kobo,
        (SELECT COUNT(*) FROM vtu_transactions) AS transactions,
        (SELECT COUNT(*) FROM vtu_transactions WHERE status = 'success') AS successful,
        (SELECT COUNT(*) FROM vtu_transactions WHERE status = 'pending') AS pending,
        (SELECT COUNT(*) FROM vtu_transactions WHERE status = 'failed') AS failed,
        (SELECT COALESCE(SUM(amount_kobo), 0) FROM vtu_transactions WHERE status = 'success') AS transaction_volume_kobo,
        (SELECT COUNT(*) FROM users WHERE status = 'active' AND role = 'user') AS active_users`);
    const row = result.rows[0] || {};
    res.json({ summary: {
        users: Number(row.users || 0),
        activeUsers: Number(row.active_users || 0),
        deposits: Number(row.deposits || 0),
        depositVolume: Number(row.deposit_volume_kobo || 0) / 100,
        transactions: Number(row.transactions || 0),
        successful: Number(row.successful || 0),
        pending: Number(row.pending || 0),
        failed: Number(row.failed || 0),
        transactionVolume: Number(row.transaction_volume_kobo || 0) / 100
    } });
});

app.get("/admin/dashboard/trend", requireSession, requireAdmin, async (req, res) => {
    const days = Math.min(Math.max(Number(req.query.days) || 14, 1), 90);
    const result = await pool.query(`SELECT day::date AS date, COALESCE(SUM(amount_kobo), 0) AS volume_kobo
        FROM generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, INTERVAL '1 day') AS day
        LEFT JOIN vtu_transactions ON created_at::date = day::date AND status = 'success'
        GROUP BY day::date ORDER BY day::date`, [days]);
    res.json({ trend: result.rows.map((row) => ({ date: row.date, volume: Number(row.volume_kobo || 0) / 100 })) });
});

app.get("/admin/dashboard/revenue-by-type", requireSession, requireAdmin, async (req, res) => {
    const result = await pool.query(`SELECT type, COUNT(*)::int AS count, COALESCE(SUM(amount_kobo), 0) AS volume_kobo
        FROM vtu_transactions WHERE status = 'success' GROUP BY type ORDER BY volume_kobo DESC`);
    res.json({ revenue: result.rows.map((row) => ({ type: row.type, count: row.count, volume: Number(row.volume_kobo || 0) / 100 })) });
});

app.get("/admin/dashboard/today", requireSession, requireAdmin, async (req, res) => {
    const result = await pool.query(`SELECT
        (SELECT COUNT(*) FROM vtu_transactions WHERE created_at >= CURRENT_DATE) AS transactions,
        (SELECT COALESCE(SUM(amount_kobo), 0) FROM vtu_transactions WHERE created_at >= CURRENT_DATE AND status = 'success') AS volume_kobo,
        (SELECT COUNT(DISTINCT user_id) FROM vtu_transactions WHERE created_at >= CURRENT_DATE) AS active_users`);
    const row = result.rows[0] || {};
    res.json({ today: { transactions: Number(row.transactions || 0), volume: Number(row.volume_kobo || 0) / 100, activeUsers: Number(row.active_users || 0) } });
});

app.get("/admin/users", requireSession, requireAdmin, async (req, res) => {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
    const offset = (page - 1) * limit;
    const search = typeof req.query.search === "string" ? `%${req.query.search.trim()}%` : "%";
    const status = typeof req.query.status === "string" && ["active", "blocked"].includes(req.query.status) ? req.query.status : null;
    const [rows, count] = await Promise.all([
        pool.query(`SELECT u.id, u.username, u.full_name, u.email, u.phone, u.status, u.role, u.created_at,
                           COALESCE(w.balance_kobo, 0) AS balance_kobo
                    FROM users u LEFT JOIN wallets w ON w.user_id = u.id
                    WHERE u.role = 'user' AND (u.username ILIKE $1 OR COALESCE(u.email, '') ILIKE $1 OR COALESCE(u.phone, '') ILIKE $1)
                      AND ($2::text IS NULL OR u.status = $2)
                    ORDER BY u.created_at DESC LIMIT $3 OFFSET $4`, [search, status, limit, offset]),
        pool.query(`SELECT COUNT(*) FROM users u WHERE u.role = 'user' AND (u.username ILIKE $1 OR COALESCE(u.email, '') ILIKE $1 OR COALESCE(u.phone, '') ILIKE $1) AND ($2::text IS NULL OR u.status = $2)`, [search, status])
    ]);
    res.json({ users: rows.rows.map((row) => ({ ...row, balance: Number(row.balance_kobo || 0) / 100 })), page, limit, total: Number(count.rows[0].count) });
});

app.get("/admin/users/:userId", requireSession, requireAdmin, async (req, res) => {
    const result = await pool.query(`SELECT u.id, u.username, u.full_name, u.email, u.phone, u.status, u.role, u.created_at,
        COALESCE(w.balance_kobo, 0) AS balance_kobo, ap.status AS tier FROM users u
        LEFT JOIN wallets w ON w.user_id = u.id LEFT JOIN agent_profiles ap ON ap.user_id = u.id WHERE u.id = $1`, [Number(req.params.userId)]);
    if (!result.rows[0]) return res.status(404).json({ message: "User not found" });
    res.json({ user: { ...result.rows[0], balance: Number(result.rows[0].balance_kobo || 0) / 100 } });
});

app.get("/admin/users/:userId/history", requireSession, requireAdmin, async (req, res) => {
    const userId = Number(req.params.userId);
    const result = await pool.query(`SELECT reference AS id, 'deposit' AS type, amount_kobo, status, created_at FROM deposits WHERE user_id = $1
        UNION ALL SELECT reference AS id, type, amount_kobo, status, created_at FROM vtu_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200`, [userId]);
    res.json({ history: result.rows.map((row) => ({ ...row, amount: Number(row.amount_kobo || 0) / 100 })) });
});

app.patch("/admin/users/:userId/status", requireSession, requireAdmin, requireCsrf, async (req, res) => {
    const status = req.body?.status;
    if (!["active", "blocked"].includes(status)) return res.status(400).json({ message: "Invalid account status" });
    const result = await pool.query("UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 AND role = 'user' RETURNING id, username, status", [status, Number(req.params.userId)]);
    if (!result.rows[0]) return res.status(404).json({ message: "User not found" });
    await pool.query("INSERT INTO audit_logs (user_id, action, details) VALUES ($1, 'admin.user_status_changed', $2)", [req.session.sub, { targetUserId: Number(req.params.userId), status }]);
    res.json({ user: result.rows[0] });
});

app.post("/admin/users/:userId/ledger", requireSession, requireAdmin, requireCsrf, async (req, res) => {
    const amount = Number(req.body?.amount);
    const direction = req.body?.direction;
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    const idempotencyKey = req.headers["idempotency-key"];
    if (!Number.isInteger(amount) || amount <= 0 || !["credit", "debit"].includes(direction) || !reason || typeof idempotencyKey !== "string") return res.status(400).json({ message: "Valid direction, amount, reason, and Idempotency-Key are required" });
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const existing = await client.query("SELECT id FROM wallet_ledger WHERE idempotency_key = $1 FOR UPDATE", [idempotencyKey]);
        if (existing.rows[0]) {
            await client.query("COMMIT");
            return res.status(200).json({ message: "Ledger adjustment already applied", idempotencyKey });
        }
        const wallet = await client.query("UPDATE wallets SET balance_kobo = balance_kobo + $1, updated_at = NOW() WHERE user_id = $2 AND balance_kobo + $1 >= 0 RETURNING balance_kobo", [direction === "credit" ? amount * 100 : -amount * 100, Number(req.params.userId)]);
        if (!wallet.rows[0]) { await client.query("ROLLBACK"); return res.status(400).json({ message: "User not found or insufficient balance" }); }
        await client.query(`INSERT INTO wallet_ledger (user_id, entry_type, amount_kobo, balance_after_kobo, idempotency_key) VALUES ($1, 'commission', $2, $3, $4) ON CONFLICT DO NOTHING`, [Number(req.params.userId), direction === "credit" ? amount * 100 : -amount * 100, wallet.rows[0].balance_kobo, idempotencyKey]);
        await client.query("INSERT INTO audit_logs (user_id, action, details) VALUES ($1, 'admin.ledger_adjusted', $2)", [req.session.sub, { targetUserId: Number(req.params.userId), direction, amount, reason, idempotencyKey }]);
        await client.query("COMMIT");
        res.json({ balance: Number(wallet.rows[0].balance_kobo) / 100 });
    } catch (error) { await client.query("ROLLBACK"); console.error(error); res.status(500).json({ message: "Could not post ledger adjustment" }); } finally { client.release(); }
});

app.get("/admin/transactions", requireSession, requireAdmin, async (req, res) => {
    const result = await pool.query(`SELECT vt.reference AS id, vt.type, vt.network, vt.phone, vt.amount_kobo, vt.status, vt.provider, vt.provider_reference, vt.created_at, u.username
        FROM vtu_transactions vt JOIN users u ON u.id = vt.user_id ORDER BY vt.created_at DESC LIMIT 200`);
    res.json({ transactions: result.rows.map((row) => ({ ...row, amount: Number(row.amount_kobo || 0) / 100 })) });
});

app.get("/admin/audit-log", requireSession, requireAdmin, async (req, res) => {
    const result = await pool.query(`SELECT a.id, a.action, a.details, a.ip_address, a.created_at, u.username AS actor
        FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT 300`);
    res.json({ auditLog: result.rows });
});

app.get("/admin/risk-cases", requireSession, requireAdmin, async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : "";
    const result = await pool.query(`SELECT f.id, f.user_id, u.username, u.email, f.operation,
        f.risk_score, f.reason_codes, f.ip_address, f.created_at,
        CASE WHEN f.risk_score >= 80 THEN 'open' WHEN f.risk_score >= 50 THEN 'reviewing' ELSE 'resolved' END AS status
        FROM fraud_events f LEFT JOIN users u ON u.id = f.user_id
        WHERE ($1 = '' OR CASE WHEN f.risk_score >= 80 THEN 'open' WHEN f.risk_score >= 50 THEN 'reviewing' ELSE 'resolved' END = $1)
        ORDER BY f.created_at DESC LIMIT 300`, [status]);
    res.json({ cases: result.rows });
});

app.get("/admin/analytics", requireSession, requireAdmin, async (req, res) => {
    const [summaryResult, monthlyResult, topCustomersResult, serviceBreakdownResult, usersResult, transactionsResult] = await Promise.all([
        pool.query(
            `SELECT
                (SELECT COUNT(*) FROM users) AS total_users,
                (SELECT COUNT(*) FROM users u
                 WHERE EXISTS (SELECT 1 FROM vtu_transactions vt WHERE vt.user_id = u.id)
                    OR EXISTS (SELECT 1 FROM deposits d WHERE d.user_id = u.id)
                    OR COALESCE((SELECT w.balance_kobo FROM wallets w WHERE w.user_id = u.id), 0) > 0) AS active_users,
                (SELECT COUNT(*) FROM vtu_transactions) AS total_transactions,
                (SELECT COUNT(*) FROM vtu_transactions WHERE status = 'success') AS successful_transactions,
                (SELECT COUNT(*) FROM vtu_transactions WHERE status = 'pending') AS pending_transactions,
                (SELECT COUNT(*) FROM vtu_transactions WHERE status = 'failed') AS failed_transactions,
                (SELECT COALESCE(SUM(amount_kobo), 0) FROM deposits WHERE status = 'success') AS total_deposit_kobo,
                (SELECT COALESCE(SUM(amount_kobo), 0) FROM vtu_transactions WHERE status = 'success') AS total_vtu_kobo,
                (SELECT COALESCE(SUM(balance_kobo), 0) FROM wallets) AS total_wallet_balance_kobo`
        ),
        pool.query(
            `WITH monthly_entries AS (
                SELECT date_trunc('month', created_at) AS month, amount_kobo AS amount
                FROM deposits
                WHERE status = 'success'
                UNION ALL
                SELECT date_trunc('month', created_at) AS month, amount_kobo AS amount
                FROM vtu_transactions
                WHERE status = 'success'
            )
             SELECT to_char(month, 'YYYY-MM') AS month,
                    COUNT(*) AS transactions,
                    COALESCE(SUM(amount), 0) AS revenue_kobo
             FROM monthly_entries
             GROUP BY month
             ORDER BY month DESC
             LIMIT 6`
        ),
        pool.query(
            `SELECT u.id, u.username, u.email,
                    COALESCE(SUM(vt.amount_kobo), 0) AS total_spent_kobo,
                    COALESCE(COUNT(vt.id), 0) AS total_orders,
                    MAX(vt.created_at) AS last_order_at
             FROM users u
             LEFT JOIN vtu_transactions vt ON vt.user_id = u.id AND vt.status = 'success'
             WHERE u.role = 'user'
             GROUP BY u.id, u.username, u.email
             HAVING COALESCE(SUM(vt.amount_kobo), 0) > 0
             ORDER BY total_spent_kobo DESC, total_orders DESC
             LIMIT 10`
        ),
        pool.query(
            `SELECT type, COUNT(*) AS total_count,
                    COALESCE(SUM(CASE WHEN status = 'success' THEN amount_kobo ELSE 0 END), 0) AS revenue_kobo
             FROM vtu_transactions
             GROUP BY type
             ORDER BY revenue_kobo DESC, total_count DESC`
        ),
        pool.query(
            `SELECT u.id, u.username, u.email, u.role, u.status,
                    w.balance_kobo AS wallet_balance_kobo,
                    (SELECT COUNT(*) FROM vtu_transactions vt WHERE vt.user_id = u.id) AS transaction_count,
                    (SELECT COUNT(*) FROM deposits d WHERE d.user_id = u.id) AS deposit_count
             FROM users u
             JOIN wallets w ON w.user_id = u.id
             ORDER BY u.created_at DESC`
        ),
        pool.query(
            `SELECT d.reference AS id,
                    'deposit' AS type,
                    'Wallet funding' AS label,
                    d.amount_kobo,
                    d.status,
                    d.created_at,
                    d.user_id,
                    u.username AS user_name
             FROM deposits d
             JOIN users u ON u.id = d.user_id
             UNION ALL
             SELECT vt.reference AS id,
                    vt.type,
                    INITCAP(vt.type) || ' · ' || vt.network || ' · ' || vt.phone AS label,
                    vt.amount_kobo,
                    vt.status,
                    vt.created_at,
                    vt.user_id,
                    u.username AS user_name
             FROM vtu_transactions vt
             JOIN users u ON u.id = vt.user_id
             ORDER BY created_at DESC
             LIMIT 120`
        )
    ]);

    const summary = summaryResult.rows[0] || {};

    res.json({
        summary: {
            totalUsers: Number(summary.total_users || 0),
            activeUsers: Number(summary.active_users || 0),
            totalTransactions: Number(summary.total_transactions || 0),
            successfulTransactions: Number(summary.successful_transactions || 0),
            pendingTransactions: Number(summary.pending_transactions || 0),
            failedTransactions: Number(summary.failed_transactions || 0),
            totalRevenue: Number(summary.total_deposit_kobo || 0) / 100 + Number(summary.total_vtu_kobo || 0) / 100,
            totalWalletBalance: Number(summary.total_wallet_balance_kobo || 0) / 100,
        },
        monthlyPerformance: monthlyResult.rows.map((row) => ({
            month: row.month,
            revenue: Number(row.revenue_kobo || 0) / 100,
            transactions: Number(row.transactions || 0),
        })),
        topCustomers: topCustomersResult.rows.map((row) => ({
            id: String(row.id),
            name: row.username,
            email: row.email,
            totalSpent: Number(row.total_spent_kobo || 0) / 100,
            orders: Number(row.total_orders || 0),
            lastOrder: row.last_order_at,
        })),
        serviceBreakdown: serviceBreakdownResult.rows.map((row) => ({
            type: row.type,
            totalCount: Number(row.total_count || 0),
            revenue: Number(row.revenue_kobo || 0) / 100,
        })),
        users: usersResult.rows.map((row) => ({
            id: String(row.id),
            name: row.username,
            email: row.email,
            role: row.role,
            status: row.status || 'active',
            wallet: Number(row.wallet_balance_kobo || 0) / 100,
            walletBalance: Number(row.wallet_balance_kobo || 0) / 100,
            transactionCount: Number(row.transaction_count || 0),
            depositCount: Number(row.deposit_count || 0),
        })),
        transactions: transactionsResult.rows.map((row) => ({
            id: String(row.id),
            userId: String(row.user_id),
            userName: row.user_name,
            type: row.type,
            label: row.label,
            amount: Number(row.amount_kobo || 0) / 100,
            status: row.status,
            date: row.created_at,
        })),
        recentTransactions: transactionsResult.rows.slice(0, 5).map((row) => ({
            id: String(row.id),
            label: row.label,
            amount: Number(row.amount_kobo || 0) / 100,
            status: row.status,
            date: row.created_at,
        })),
    });
});

app.get("/admin/users/:userId/history", requireSession, requireAdmin, async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isSafeInteger(userId) || userId < 1) {
        return res.status(400).json({ message: "Invalid user id" });
    }

    const result = await pool.query(
        `SELECT reference AS id, 'deposit' AS type, 'Wallet funding' AS label,
                amount_kobo, status, created_at, user_id
         FROM deposits
         WHERE user_id = $1
         UNION ALL
         SELECT reference AS id, type,
                INITCAP(type) || ' · ' || network || ' · ' || phone AS label,
                amount_kobo, status, created_at, user_id
         FROM vtu_transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 200`,
        [userId]
    );

    res.json({
        userId,
        transactions: result.rows.map((transaction) => ({
            id: transaction.id,
            type: transaction.type,
            label: transaction.label,
            amount: Number(transaction.amount_kobo) / 100,
            status: transaction.status,
            date: transaction.created_at,
            currency: "NGN"
        }))
    });
});

app.post("/admin/users/:userId/fund", requireSession, requireAdmin, requireCsrf, async (req, res) => {
    const userId = Number(req.params.userId);
    const amount = Number(req.body?.amount);
    if (!Number.isSafeInteger(userId) || userId < 1) {
        return res.status(400).json({ message: "Invalid user id" });
    }
    if (!Number.isInteger(amount) || amount < 1 || amount > 1000000) {
        return res.status(400).json({ message: "Amount must be between 1 and 1,000,000 naira" });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const userResult = await client.query(
            "SELECT id, username FROM users WHERE id = $1 FOR UPDATE",
            [userId]
        );
        if (!userResult.rows[0]) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "User not found" });
        }

        const reference = `admin_fund_${userId}_${crypto.randomUUID()}`;
        const depositResult = await client.query(
            `INSERT INTO deposits (user_id, reference, amount_kobo, fee_kobo, credit_amount_kobo, status, created_at, verified_at)
             VALUES ($1, $2, $3, 0, $3, 'pending', NOW(), NOW())
             RETURNING id, user_id, reference, amount_kobo, credit_amount_kobo`,
            [userId, reference, amount * 100]
        );

        const deposit = depositResult.rows[0];
        const settled = await settleDeposit(client, deposit);
        if (!settled) {
            await client.query("ROLLBACK");
            return res.status(500).json({ message: "Could not fund user wallet" });
        }

        await client.query(
            "INSERT INTO audit_logs (user_id, action, details) VALUES ($1, 'admin.funds_added', $2)",
            [req.session.sub, { targetUserId: userId, amount: amount, reference }]
        );

        const walletResult = await client.query(
            "SELECT balance_kobo FROM wallets WHERE user_id = $1",
            [userId]
        );

        await client.query("COMMIT");
        res.json({
            message: "User wallet funded successfully",
            walletBalance: Number(walletResult.rows[0]?.balance_kobo || 0) / 100,
            user: { id: String(userId), username: userResult.rows[0].username }
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        res.status(500).json({ message: error.message || "Could not fund user wallet" });
    } finally {
        client.release();
    }
});

app.post("/admin/users/:userId/block", requireSession, requireAdmin, requireCsrf, async (req, res) => {
    const userId = Number(req.params.userId);
    const nextStatus = req.body?.status;

    if (!Number.isSafeInteger(userId) || userId < 1) {
        return res.status(400).json({ message: "Invalid user id" });
    }
    if (nextStatus !== "active" && nextStatus !== "blocked") {
        return res.status(400).json({ message: "Invalid account status" });
    }

    const result = await pool.query(
        `UPDATE users
         SET status = $1, updated_at = NOW()
         WHERE id = $2 AND role = 'user'
         RETURNING id, username, status`,
        [nextStatus, userId]
    );

    if (!result.rows[0]) {
        return res.status(404).json({ message: "User not found or cannot be updated" });
    }

    await pool.query(
        "INSERT INTO audit_logs (user_id, action, details) VALUES ($1, 'admin.user_status_changed', $2)",
        [req.session.sub, { targetUserId: userId, status: nextStatus }]
    );

    res.json({
        message: nextStatus === "blocked" ? "User account blocked successfully" : "User account restored successfully",
        user: result.rows[0]
    });
});

app.get("/admin/agents", requireSession, requireAdmin, async (req, res) => {
    const result = await pool.query(
        `SELECT u.id, u.username, u.email, ap.status, ap.daily_limit_kobo,
                ap.verified_at, ap.updated_at
         FROM agent_profiles ap
         JOIN users u ON u.id = ap.user_id
         ORDER BY ap.updated_at DESC`
    );
    res.json({ agents: result.rows });
});

app.post("/admin/agents/:userId/verify", requireSession, requireAdmin, requireCsrf, async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isSafeInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid user id" });
    const status = req.body?.status;
    if (!['verified', 'suspended', 'pending'].includes(status)) return res.status(400).json({ message: "Invalid agent status" });
    const result = await pool.query(
        `UPDATE agent_profiles
         SET status = $1, verified_by = CASE WHEN $1 = 'verified' THEN $2 ELSE verified_by END,
             verified_at = CASE WHEN $1 = 'verified' THEN NOW() ELSE verified_at END,
             updated_at = NOW()
         WHERE user_id = $3
         RETURNING user_id, status, daily_limit_kobo, verified_at`,
        [status, req.session.sub, userId]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Agent request not found" });
    await pool.query(
        "INSERT INTO audit_logs (user_id, action, details) VALUES ($1, 'agent.status_changed', $2)",
        [userId, { status, changedBy: req.session.sub }]
    );
    res.json({ agent: result.rows[0] });
});

app.post("/payments/paystack/initialize", requireSession, requireCsrf, async (req, res) => {
    const amount = req.body?.amount;
    const feeKobo = Number(req.body?.feeKobo || 0) * 100;
    const dedicatedAccountNumber = typeof req.body?.dedicatedAccountNumber === "string" ? req.body.dedicatedAccountNumber.trim() : null;
    const dedicatedAccountReference = typeof req.body?.dedicatedAccountReference === "string" ? req.body.dedicatedAccountReference.trim() : null;
    const returnToApp = req.body?.returnToApp === true;

    if (!Number.isInteger(amount) || amount < 100 || amount > 1000000) {
        return res.status(400).json({ message: "Amount must be an integer between 100 and 1,000,000 naira" });
    }
    if (!Number.isInteger(feeKobo) || feeKobo < 0) {
        return res.status(400).json({ message: "Invalid fee configuration" });
    }

    let reference;
    try {
        const userResult = await pool.query("SELECT id, email FROM users WHERE id = $1", [req.session.sub]);
        const user = userResult.rows[0];
        if (!user) return res.status(401).json({ message: "Authentication required" });

        const creditAmountKobo = calculateCreditAmount(amount * 100, feeKobo);
        reference = `abbakano_${user.id}_${crypto.randomUUID()}`;
        // Persist before contacting Paystack so an early webhook always has a row to settle.
        await pool.query(
            `INSERT INTO deposits (user_id, reference, amount_kobo, fee_kobo, credit_amount_kobo, dedicated_account_number, dedicated_account_reference)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [user.id, reference, amount * 100, feeKobo, creditAmountKobo, dedicatedAccountNumber, dedicatedAccountReference]
        );
        const payment = await paystackRequest("/transaction/initialize", {
            method: "POST",
            body: JSON.stringify({
                email: user.email,
                amount: amount * 100,
                reference,
                callback_url: returnToApp
                    ? `${PAYSTACK_CALLBACK_URL}${PAYSTACK_CALLBACK_URL.includes("?") ? "&" : "?"}return=app`
                    : PAYSTACK_CALLBACK_URL,
                metadata: {
                    user_id: String(user.id),
                    purpose: dedicatedAccountNumber ? "dedicated_account" : "wallet_deposit",
                    ...(dedicatedAccountNumber ? { account_number: dedicatedAccountNumber } : {}),
                    ...(dedicatedAccountReference ? { account_reference: dedicatedAccountReference } : {})
                }
            })
        });

        res.json({ authorizationUrl: payment.authorization_url, reference });
    } catch (error) {
        if (reference) {
            await pool.query(
                "UPDATE deposits SET status = 'failed', failure_reason = 'Payment initialization failed', failed_at = NOW() WHERE reference = $1 AND status = 'pending'",
                [reference]
            ).catch(() => {});
        }
        console.error(error);
        res.status(502).json({ message: "Could not start Paystack payment" });
    }
});

app.get("/payments/paystack/callback", async (req, res) => {
    const reference = typeof req.query.reference === "string" ? req.query.reference : "";
    const returnToApp = req.query.return === "app";
    const returnUrl = returnToApp ? PAYSTACK_APP_CALLBACK_URL : PAYSTACK_FRONTEND_URL;
    const redirectWith = (params) => {
        const separator = returnUrl.includes("?") ? "&" : "?";
        return res.redirect(`${returnUrl}${separator}${params}`);
    };
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(reference)) {
        return redirectWith("payment=invalid");
    }

    const client = await pool.connect();
    try {
        const depositResult = await client.query(
            "SELECT id, user_id, reference, amount_kobo, status FROM deposits WHERE reference = $1",
            [reference]
        );
        const deposit = depositResult.rows[0];
        if (!deposit) return redirectWith("payment=missing");
        if (deposit.status === "pending") {
            const payment = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
            const verified = isVerifiedPaystackDeposit(payment, { ...deposit, reference });
            if (verified) {
                await client.query("BEGIN");
                const locked = await client.query(
                    "SELECT id, user_id, reference, amount_kobo, status FROM deposits WHERE id = $1 FOR UPDATE",
                    [deposit.id]
                );
                if (locked.rows[0]?.status === "pending") await settleDeposit(client, locked.rows[0]);
                await client.query("COMMIT");
            }
        }
        return redirectWith(`reference=${encodeURIComponent(reference)}`);
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        console.error(error);
        return redirectWith(`reference=${encodeURIComponent(reference)}&payment=pending`);
    } finally {
        client.release();
    }
});

app.get("/payments/paystack/verify/:reference", requireSession, async (req, res) => {
    const reference = req.params.reference;
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(reference)) {
        return res.status(400).json({ message: "Invalid payment reference" });
    }

    const client = await pool.connect();
    try {
        const depositResult = await client.query(
            "SELECT id, user_id, amount_kobo, status FROM deposits WHERE reference = $1 AND user_id = $2",
            [reference, req.session.sub]
        );
        const deposit = depositResult.rows[0];
        if (!deposit) return res.status(404).json({ message: "Deposit not found" });
        if (deposit.status === "success") return res.json({ status: "success", amount: Number(deposit.amount_kobo) / 100 });
        if (deposit.status === "failed") return res.status(409).json({ status: "failed", message: "This payment cannot be settled" });

        const payment = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
        const verified = isVerifiedPaystackDeposit(payment, { ...deposit, reference });
        if (!verified) {
            if (["failed", "abandoned", "reversed"].includes(payment.status)) {
                await client.query("UPDATE deposits SET status = 'failed', failure_reason = $1, failed_at = NOW() WHERE id = $2 AND status = 'pending'", ["Paystack reported an unsuccessful payment", deposit.id]);
                return res.status(400).json({ status: "failed", message: "Payment could not be verified" });
            }
            return res.status(202).json({ status: "pending", message: "Payment is still being processed" });
        }

        await client.query("BEGIN");
        const locked = await client.query(
            "SELECT id, user_id, reference, amount_kobo, status FROM deposits WHERE id = $1 FOR UPDATE",
            [deposit.id]
        );
        if (locked.rows[0]?.status === "pending") await settleDeposit(client, locked.rows[0]);
        await client.query("COMMIT");
        res.json({ status: "success", amount: Number(deposit.amount_kobo) / 100 });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        res.status(502).json({ message: "Could not verify Paystack payment" });
    } finally {
        client.release();
    }
});

app.post("/payments/paystack/webhook", async (req, res) => {
    if (!PAYSTACK_SECRET_KEY) return res.sendStatus(503);
    const signature = req.headers["x-paystack-signature"];
    const expected = crypto.createHmac("sha512", PAYSTACK_SECRET_KEY).update(req.rawBody || Buffer.alloc(0)).digest("hex");
    if (typeof signature !== "string" || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return res.sendStatus(401);
    }

    let event;
    try {
        event = JSON.parse((req.rawBody || Buffer.alloc(0)).toString("utf8"));
    } catch {
        return res.sendStatus(400);
    }
    if (event.event !== "charge.success" || !event.data?.reference) return res.sendStatus(200);

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const depositResult = await client.query(
            "SELECT id, user_id, amount_kobo FROM deposits WHERE reference = $1 FOR UPDATE",
            [event.data.reference]
        );
        const deposit = depositResult.rows[0];
        if (deposit && isVerifiedPaystackDeposit(event.data, { ...deposit, reference: event.data.reference })) {
            await settleDeposit(client, { ...deposit, reference: event.data.reference });
        }
        await client.query("COMMIT");
        res.sendStatus(200);
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        res.sendStatus(500);
    } finally {
        client.release();
    }
});

app.post("/vtu/vtpass/webhook", async (req, res) => {
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const data = payload.data && typeof payload.data === "object" ? payload.data : payload;
    const providerRequestId = String(
        data.request_id || data.requestId || data.provider_request_id || data.providerRequestId || ""
    );
    const providerReference = String(
        data.reference || data.transaction_id || data.transactionId || data.provider_reference || ""
    );
    const status = String(
        data.status || data.current_status || data.response_description || payload.status || ""
    ).toLowerCase();
    const successful = ["success", "successful", "delivered", "completed", "000"].includes(status)
        || data.code === "000"
        || payload.code === "000";

    if (!successful || (!providerRequestId && !providerReference)) return res.sendStatus(200);

    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT id, user_id, reference, status
             FROM vtu_transactions
             WHERE status = 'pending'
               AND provider = 'vtpass'
                             AND (provider_request_id = NULLIF($1, '') OR provider_reference = NULLIF($2, '') OR reference = NULLIF($1, ''))`,
            [providerRequestId, providerReference]
        );
        const transaction = result.rows[0];
        if (transaction) {
            await finalizeVtuSuccess(transaction.id, transaction.user_id, {
                provider: "vtpass",
                providerRequestId: providerRequestId || transaction.reference,
                providerReference: providerReference || providerRequestId || transaction.reference,
                message: data.message || payload.message || "Transaction successful"
            }, {
                status: "success",
                reference: transaction.reference,
                message: data.message || payload.message || "Transaction successful"
            });
        }
        return res.sendStatus(200);
    } catch (error) {
        console.error("VTPass webhook reconciliation failed", error);
        return res.sendStatus(500);
    } finally {
        client.release();
    }
});

app.get("/vtu/plans", requireSession, async (req, res) => {
    try {
        const network = typeof req.query.network === "string" ? req.query.network.trim() : undefined;
        const planType = typeof req.query.planType === "string" ? req.query.planType.trim() : undefined;
        const plans = await getVtuPlans({ network, planType });
        res.json({ plans });
    } catch (error) {
        console.error(error);
        res.status(502).json({ message: error.message || "Could not load data plans" });
    }
});

app.get("/vtu/account-details", requireSession, async (req, res) => {
    try {
        res.json({ account: await getVtuGateAccountDetails() });
    } catch (error) {
        console.error(error);
        res.status(502).json({ message: error.message || "Could not load VTU account details" });
    }
});

app.get("/vtu/service-plans", requireSession, async (req, res) => {
    try {
        const service = req.query.service === "cable" || req.query.service === "electricity" ? req.query.service : null;
        const provider = typeof req.query.provider === "string" ? req.query.provider.trim() : "";
        const meterType = req.query.meterType === "postpaid" ? "postpaid" : "prepaid";
        if (!service || !provider) return res.status(400).json({ message: "Choose a supported service and provider" });
        if (service === "cable" && process.env.VTU_GATE_API_KEY) {
            const smartcardNumber = typeof req.query.smartcardNumber === "string" ? req.query.smartcardNumber.replace(/\D/g, "") : "";
            if (!/^\d{10}$/.test(smartcardNumber)) return res.json({ plans: [] });
            const user = await pool.query("SELECT phone FROM users WHERE id = $1", [req.session.sub]);
            const result = await verifyVtuGateCable({ provider, smartcardNumber, phone: user.rows[0]?.phone || "" });
            return res.json({ plans: result.plans });
        }
        res.json({ plans: await getVtpassServicePlans({ service, provider, meterType }) });
    } catch (error) {
        console.error(error);
        res.status(502).json({ message: error.message || "Could not load service plans" });
    }
});

app.post("/vtu/verify-electricity", requireSession, requireCsrf, async (req, res) => {
    const provider = typeof req.body?.provider === "string" ? req.body.provider.trim().toLowerCase() : "";
    const meterNumber = typeof req.body?.meterNumber === "string" ? req.body.meterNumber.replace(/\D/g, "") : "";
    if (!provider || !/^\d{8,14}$/.test(meterNumber)) {
        return res.status(400).json({ message: "Enter a valid meter number" });
    }

    try {
        res.json(await verifyVtuGateElectricity({ provider, meterNo: meterNumber }));
    } catch (error) {
        console.error(error);
        res.status(502).json({ message: error.message || "Could not verify electricity meter" });
    }
});

app.post("/vtu/verify-cable", requireSession, requireCsrf, async (req, res) => {
    const provider = typeof req.body?.provider === "string" ? req.body.provider.trim().toLowerCase() : "";
    const smartcardNumber = typeof req.body?.smartcardNumber === "string" ? req.body.smartcardNumber.replace(/\D/g, "") : "";
    if (!["dstv", "gotv", "startimes"].includes(provider) || !/^\d{10}$/.test(smartcardNumber)) {
        return res.status(400).json({ message: "Enter a valid 10-digit cable number" });
    }

    try {
        const user = await pool.query("SELECT phone FROM users WHERE id = $1", [req.session.sub]);
        const result = process.env.VTU_GATE_API_KEY
            ? await verifyVtuGateCable({ provider, smartcardNumber, phone: user.rows[0]?.phone || "" })
            : await verifyVtpassCableCustomer({ provider, smartcardNumber });
        if (!result.customerName) return res.status(502).json({ message: "VTPass did not return a customer name" });
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(502).json({ message: error.message || "Could not verify cable customer" });
    }
});

app.post("/vtu/airtime", requireSession, requireCsrf, vtuRateLimiter, async (req, res) => {
    return executeVtuPurchase(req, res, "airtime");
});

app.post("/vtu/data", requireSession, requireCsrf, vtuRateLimiter, async (req, res) => {
    return executeVtuPurchase(req, res, "data");
});

app.post("/vtu/electricity", requireSession, requireCsrf, vtuRateLimiter, async (req, res) => executeVtuPurchase(req, res, "electricity"));
app.post("/vtu/cable_tv", requireSession, requireCsrf, vtuRateLimiter, async (req, res) => executeVtuPurchase(req, res, "cable_tv"));

app.get("/vtu/transactions", requireSession, async (req, res) => {
    const result = await pool.query(
        `SELECT reference, provider_reference, type, network, phone, plan_code,
                amount_kobo, status, failure_reason, created_at, completed_at
         FROM vtu_transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [req.session.sub]
    );
    res.json({ transactions: result.rows.map((transaction) => ({
        ...transaction,
        amount: Number(transaction.amount_kobo) / 100,
        currency: "NGN"
    })) });
});

app.post("/logout", (req, res) => {
    res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
    res.append("Set-Cookie", "csrf=; Path=/; Max-Age=0; SameSite=Lax");
    res.sendStatus(204);
});

async function startServer() {
    if (redisClient && !redisClient.isOpen) {
        await redisClient.connect();
        console.log("Redis-backed rate limiting enabled");
    }

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer().catch((error) => {
    console.error("Could not start server", error);
    process.exitCode = 1;
});
