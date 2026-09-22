const test = require("node:test");
const assert = require("node:assert/strict");
const { buildFallbackDedicatedAccount } = require("../dedicated-account");

test("fallback dedicated account is generated when DVA is unavailable", () => {
    const result = buildFallbackDedicatedAccount({ id: 42, username: "demo user" });

    assert.match(result.dedicatedAccountNumber, /^DVA-/);
    assert.match(result.dedicatedAccountReference, /^local_/);
    assert.equal(result.dedicatedAccountNumber.includes("42"), true);
});
