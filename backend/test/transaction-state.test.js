const test = require("node:test");
const assert = require("node:assert/strict");
const { canTransition, isTerminal, isVerifiedPaystackDeposit, calculateCreditAmount } = require("../transaction-state");
const { isVtpassFallbackEligible } = require("../vtu-provider");

test("only a pending transaction can enter a terminal state", () => {
    assert.equal(canTransition("pending", "success"), true);
    assert.equal(canTransition("pending", "failed"), true);
    assert.equal(canTransition("success", "failed"), false);
    assert.equal(canTransition("failed", "success"), false);
    assert.equal(isTerminal("success"), true);
    assert.equal(isTerminal("pending"), false);
});

test("Paystack deposit verification binds payment to the intended deposit", () => {
    const deposit = { reference: "abbakano_4_ref", user_id: 4, amount_kobo: 12500 };
    const payment = {
        status: "success", currency: "NGN", amount: 12500, reference: deposit.reference,
        metadata: { user_id: "4", purpose: "wallet_deposit" }
    };
    assert.equal(isVerifiedPaystackDeposit(payment, deposit), true);
    assert.equal(isVerifiedPaystackDeposit({ ...payment, currency: "USD" }, deposit), false);
    assert.equal(isVerifiedPaystackDeposit({ ...payment, metadata: { user_id: "5", purpose: "wallet_deposit" } }, deposit), false);
    assert.equal(isVerifiedPaystackDeposit({ ...payment, reference: "other" }, deposit), false);
});

test("dedicated account deposits keep a fee separate from the wallet credit", () => {
    assert.equal(calculateCreditAmount(100000, 5000), 95000);
    assert.equal(calculateCreditAmount(100000, 0), 100000);
    assert.equal(calculateCreditAmount(5000, 5000), 0);
});

test("only confirmed VTPass pre-processing rejection is fallback eligible", () => {
    assert.equal(isVtpassFallbackEligible("028"), true);
    assert.equal(isVtpassFallbackEligible("019"), false);
    assert.equal(isVtpassFallbackEligible("500"), false);
});
