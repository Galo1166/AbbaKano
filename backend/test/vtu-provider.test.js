const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret";
process.env.VTU_PRIMARY_PROVIDER = "vtugate";
process.env.VTU_GATE_API_KEY = "test-gate-key";
const { resolvePlanToken, encodePlanToken, isVtuGateOnly, normalizeVtuGateCustomerName, verifyVtuGateCable } = require("../vtu-provider");

test("VTU Gate-only mode is enabled when selected explicitly", () => {
    assert.equal(isVtuGateOnly(), true);
});

test("VTU Gate cable customer names normalize top-level aliases", () => {
    assert.equal(normalizeVtuGateCustomerName({ data: { smartcard_name: "DSTV Customer" } }), "DSTV Customer");
    assert.equal(normalizeVtuGateCustomerName({ data: { customerName: "GOtv Customer" } }), "GOtv Customer");
});

test("VTU Gate cable customer names normalize nested customer details", () => {
    assert.equal(normalizeVtuGateCustomerName({ data: { customer: { name: "StarTimes Customer" } } }), "StarTimes Customer");
    assert.equal(normalizeVtuGateCustomerName({ data: { customer_details: { full_name: "Cable Customer" } } }), "Cable Customer");
    assert.equal(normalizeVtuGateCustomerName({ data: { cable_plans: [] } }), "");
});

test("VTU Gate GOtv verification uses its catalog service ID and returns verified plans", async () => {
    const originalFetch = global.fetch;
    const requests = [];
    global.fetch = async (url, options) => {
        requests.push({ url: String(url), options });
        const payload = requests.length === 1
            ? { status: true, data: [
                { service_type: "tv", tv_name: "DStv", service_id: 71 },
                { service_type: "tv", tv_name: "GOtv", service_id: 82 }
            ] }
            : { status: true, data: {
                smartcard_name: "GOtv Test Customer",
                cable_plans: [{ name: "GOtv Smallie", code: "smallie", price: "1900" }]
            } };
        return { ok: true, status: 200, json: async () => payload };
    };

    try {
        const result = await verifyVtuGateCable({
            provider: "gotv",
            smartcardNumber: "1234567890",
            phone: "08012345678"
        });

        assert.equal(requests.length, 2);
        assert.match(requests[0].url, /\/fetchallservices$/);
        assert.match(requests[1].url, /\/verifycabletv$/);
        assert.equal(new URLSearchParams(requests[1].options.body).get("service_id"), "82");
        assert.equal(new URLSearchParams(requests[1].options.body).get("smartcard_number"), "1234567890");
        assert.equal(result.provider, "vtugate");
        assert.equal(result.customerName, "GOtv Test Customer");
        assert.deepEqual(result.plans.map(({ label, price }) => ({ label, price })), [
            { label: "GOtv Smallie", price: 1900 }
        ]);
    } finally {
        global.fetch = originalFetch;
    }
});

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

test("signed retail plans preserve the provider fulfillment price", () => {
    const token = encodePlanToken({
        provider: "vtugate",
        network: "MTN",
        providerCode: "101:bundle-500",
        price: 350,
        providerPrice: 300
    });
    const result = resolvePlanToken(token, "MTN");

    assert.equal(result.error, undefined);
    assert.equal(result.plan.price, 350);
    assert.equal(result.plan.providerPrice, 300);
    assert.equal(result.plan.providerCode, "101:bundle-500");
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
