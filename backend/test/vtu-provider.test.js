const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret";
const { resolvePlanToken } = require("../vtu-provider");

test("resolvePlanToken accepts a valid selected network even when provider payload omits the network field", () => {
    const payload = Buffer.from(JSON.stringify({
        provider: "vtpass",
        network: null,
        code: "mtn-500",
        price: 500,
        expiresAt: Math.floor(Date.now() / 1000) + 60 * 60
    })).toString("base64url");
    const signature = crypto.createHmac("sha256", process.env.AUTH_SECRET).update(payload).digest("base64url");
    const token = `${payload}.${signature}`;

    const result = resolvePlanToken(token, "MTN");
    assert.equal(result.error, undefined);
    assert.equal(result.plan.provider, "vtpass");
    assert.equal(result.plan.price, 500);
});
