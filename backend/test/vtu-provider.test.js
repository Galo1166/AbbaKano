const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret";
const { resolvePlanToken } = require("../vtu-provider");

function makeToken(plan) {
    const payload = Buffer.from(JSON.stringify({ ...plan, expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 })).toString("base64url");
    const signature = crypto.createHmac("sha256", process.env.AUTH_SECRET).update(payload).digest("base64url");
    return `${payload}.${signature}`;
}

test("resolvePlanToken accepts a valid selected network even when provider payload omits the network field", () => {
    const token = makeToken({
        provider: "vtpass",
        network: null,
        code: "mtn-500",
        price: 500
    });

    const result = resolvePlanToken(token, "MTN");
    assert.equal(result.error, undefined);
    assert.equal(result.plan.provider, "vtpass");
    assert.equal(result.plan.price, 500);
});

test("resolvePlanToken accepts VTU Gate electricity and cable tokens", () => {
    const electricityToken = makeToken({
        provider: "vtugate",
        network: "AEDC",
        providerCode: "500:prepaid",
        serviceId: 500,
        price: 0
    });
    const cableToken = makeToken({
        provider: "vtugate",
        network: "DSTV",
        providerCode: "605:compact:Compact",
        serviceId: 605,
        price: 3200
    });

    const electricity = resolvePlanToken(electricityToken, "AEDC");
    const cable = resolvePlanToken(cableToken, "DSTV");

    assert.equal(electricity.error, undefined);
    assert.equal(electricity.plan.provider, "vtugate");
    assert.equal(electricity.plan.providerCode, "500:prepaid");

    assert.equal(cable.error, undefined);
    assert.equal(cable.plan.provider, "vtugate");
    assert.equal(cable.plan.providerCode, "605:compact:Compact");
});
