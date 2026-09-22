const TERMINAL_STATUSES = new Set(["success", "failed"]);

function isTerminal(status) {
    return TERMINAL_STATUSES.has(status);
}

function canTransition(current, next) {
    return current === "pending" && (next === "success" || next === "failed");
}

function calculateCreditAmount(amountKobo, feeKobo = 0) {
    const gross = Number(amountKobo) || 0;
    const fee = Number(feeKobo) || 0;
    return Math.max(0, gross - fee);
}

function isVerifiedPaystackDeposit(payment, deposit) {
    const purpose = deposit.purpose || "wallet_deposit";
    const expectedAccountId = deposit.account_id == null ? null : String(deposit.account_id);

    return Boolean(
        payment
        && payment.status === "success"
        && payment.currency === "NGN"
        && Number(payment.amount) === Number(deposit.amount_kobo)
        && payment.reference === deposit.reference
        && payment.metadata?.user_id === String(deposit.user_id)
        && payment.metadata?.purpose === purpose
        && (expectedAccountId === null || payment.metadata?.account_id === expectedAccountId)
    );
}

module.exports = { isTerminal, canTransition, calculateCreditAmount, isVerifiedPaystackDeposit };
