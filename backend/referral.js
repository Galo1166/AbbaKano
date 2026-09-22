const REFERRAL_COMMISSION_KOBO = 20000;

async function awardReferralCommission(client, referrerUserId, referredUserId, options = {}) {
    if (!referrerUserId || !Number.isFinite(Number(referrerUserId))) {
        return { credited: false, amountKobo: 0, reference: null, balanceKobo: 0, reason: "no_referrer" };
    }

    const amountKobo = Number(options.amountKobo ?? REFERRAL_COMMISSION_KOBO);
    const reference = options.reference || `referral_${referrerUserId}_${referredUserId}_${Date.now()}`;

    const balanceResult = await client.query(
        `INSERT INTO referral_commission_balances (user_id, balance_kobo, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE
         SET balance_kobo = referral_commission_balances.balance_kobo + EXCLUDED.balance_kobo,
             updated_at = NOW()
         RETURNING balance_kobo`,
        [referrerUserId, amountKobo]
    );

    await client.query(
        `INSERT INTO referral_commission_ledger (user_id, entry_type, amount_kobo, reference)
         VALUES ($1, 'earned', $2, $3)`,
        [referrerUserId, amountKobo, reference]
    );

    const balanceKobo = Number(balanceResult?.rows?.[0]?.balance_kobo ?? amountKobo);

    return {
        credited: true,
        amountKobo,
        reference,
        balanceKobo
    };
}

module.exports = {
    REFERRAL_COMMISSION_KOBO,
    awardReferralCommission
};
