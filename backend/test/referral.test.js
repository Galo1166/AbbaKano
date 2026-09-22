const test = require("node:test");
const assert = require("node:assert/strict");
const { awardReferralCommission, REFERRAL_COMMISSION_KOBO } = require("../referral");

test("awardReferralCommission credits the referrer balance and ledger", async () => {
    const calls = [];
    const client = {
        async query(sql, params) {
            calls.push({ sql, params });
            if (sql.includes("SELECT")) {
                return { rows: [] };
            }
            return { rowCount: 1 };
        }
    };

    const result = await awardReferralCommission(client, 7, 9, { amountKobo: 25000, reference: "referral_7_9_1" });

    assert.equal(result.credited, true);
    assert.equal(result.amountKobo, 25000);
    assert.equal(REFERRAL_COMMISSION_KOBO, 20000);
    assert.equal(calls.length, 2);
    assert.match(calls[0].sql, /INSERT INTO referral_commission_balances/i);
    assert.match(calls[1].sql, /INSERT INTO referral_commission_ledger/i);
});
