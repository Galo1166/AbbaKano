function buildFallbackDedicatedAccount(user) {
    const label = String(user?.username || "user").replace(/\s+/g, "-").slice(0, 20) || "user";
    const suffix = String(user?.id ?? Date.now()).padStart(6, "0");

    return {
        dedicatedAccountNumber: `DVA-${label.toUpperCase()}-${suffix}`,
        dedicatedAccountReference: `local_${String(user?.id ?? Date.now())}_${Date.now()}`
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
    resolveDedicatedAccount
};
