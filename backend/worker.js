const pool = require("./db");
const { purchase } = require("./vtu-provider");

const MAX_ATTEMPTS = 3;

async function audit(client, userId, transactionId, action, details = {}) {
    await client.query(
        `INSERT INTO audit_logs (user_id, transaction_id, action, details)
         VALUES ($1, $2, $3, $4)`,
        [userId, transactionId, action, details]
    );
}

async function releaseFunds(client, transaction) {
    const wallet = await client.query(
        `UPDATE wallets SET balance_kobo = balance_kobo + $1, updated_at = NOW()
         WHERE user_id = $2 RETURNING balance_kobo`,
        [transaction.amount_kobo, transaction.user_id]
    );
    await client.query(
        `INSERT INTO wallet_ledger
            (user_id, transaction_id, entry_type, amount_kobo, balance_after_kobo)
         VALUES ($1, $2, 'refund', $3, $4)`,
        [transaction.user_id, transaction.id, transaction.amount_kobo, wallet.rows[0].balance_kobo]
    );
    await client.query(
        `UPDATE wallet_reservations SET status = 'released', resolved_at = NOW()
         WHERE transaction_id = $1 AND status = 'held'`,
        [transaction.id]
    );
}

async function process(transaction) {
    try {
        const result = await purchase({
            type: transaction.type,
            provider: transaction.provider,
            network: transaction.network,
            phone: transaction.phone,
            amount: Number(transaction.amount_kobo) / 100,
            planCode: transaction.plan_code,
            reference: transaction.reference
        });
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const updated = await client.query(
                `UPDATE vtu_transactions
                 SET status = 'success', provider = $1, provider_request_id = $2, provider_reference = $3, completed_at = NOW()
                 WHERE id = $4 AND status = 'pending'
                 RETURNING user_id`,
                [result.provider, result.providerRequestId, result.providerReference, transaction.id]
            );
            if (updated.rowCount === 1) {
                await client.query("UPDATE wallet_reservations SET status = 'settled', resolved_at = NOW() WHERE transaction_id = $1 AND status = 'held'", [transaction.id]);
                const response = { status: "success", reference: transaction.reference, message: result.message };
                await client.query("UPDATE idempotency_keys SET status = 'success', response_json = $1, updated_at = NOW() WHERE transaction_id = $2", [response, transaction.id]);
                await audit(client, transaction.user_id, transaction.id, "vtu.settled", { providerReference: result.providerReference });
            }
            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const attempts = Number(transaction.attempt_count) + 1;
            if (attempts >= MAX_ATTEMPTS) {
                const response = { status: "failed", reference: transaction.reference, message: "VTU provider could not complete the purchase" };
                // Claim the terminal state before issuing a refund.  This avoids a
                // late successful provider response ever being refunded as well.
                const failed = await client.query(
                    `UPDATE vtu_transactions
                     SET status = 'failed', failure_reason = $1, attempt_count = $2, completed_at = NOW()
                     WHERE id = $3 AND status = 'pending'
                     RETURNING id`,
                    [error.message, attempts, transaction.id]
                );
                if (failed.rowCount === 1) {
                    await releaseFunds(client, transaction);
                    await client.query("UPDATE idempotency_keys SET status = 'failed', response_json = $1, updated_at = NOW() WHERE transaction_id = $2", [response, transaction.id]);
                    await audit(client, transaction.user_id, transaction.id, "vtu.refunded", { reason: error.message, attempts });
                }
            } else {
                await client.query("UPDATE vtu_transactions SET attempt_count = $1, next_attempt_at = NOW() + ($2 * INTERVAL '1 minute') WHERE id = $3 AND status = 'pending'", [attempts, Math.min(60, 2 ** attempts), transaction.id]);
                await audit(client, transaction.user_id, transaction.id, "vtu.retry_scheduled", { attempts });
            }
            await client.query("COMMIT");
        } catch (retryError) {
            await client.query("ROLLBACK");
            console.error("Could not update VTU retry state", retryError);
        } finally {
            client.release();
        }
    }
}

async function tick() {
    const client = await pool.connect();
    let transactions;
    try {
        await client.query("BEGIN");
        const result = await client.query(
            `SELECT id, user_id, reference, type, network, phone, plan_code, provider, amount_kobo, attempt_count
             FROM vtu_transactions
             WHERE status = 'pending' AND next_attempt_at <= NOW()
             ORDER BY created_at
             LIMIT 20
             FOR UPDATE SKIP LOCKED`
        );
        transactions = result.rows;
        for (const transaction of transactions) {
            await client.query("UPDATE vtu_transactions SET next_attempt_at = NOW() + INTERVAL '1 minute' WHERE id = $1 AND status = 'pending'", [transaction.id]);
        }
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
    for (const transaction of transactions) await process(transaction);
}

setInterval(() => tick().catch((error) => console.error("VTU worker tick failed", error)), 15000);
tick().catch((error) => console.error("VTU worker startup failed", error));
console.log("VTU reconciliation worker started");
