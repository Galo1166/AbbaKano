-- Safe to run repeatedly against an existing installation.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS full_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS referrer_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS biometrics_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS app_lock_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS dedicated_account_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS dedicated_account_reference VARCHAR(100),
    ADD COLUMN IF NOT EXISTS transaction_pin_hash TEXT,
    ADD COLUMN IF NOT EXISTS transaction_pin_salt TEXT;

ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique_idx ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_referrer_user_id_idx ON users(referrer_user_id);

CREATE TABLE IF NOT EXISTS device_credentials (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS device_credentials_user_id_idx ON device_credentials(user_id);

CREATE TABLE IF NOT EXISTS passkey_credentials (
    id VARCHAR(255) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,
    transports JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS passkey_credentials_user_id_idx ON passkey_credentials(user_id);

CREATE TABLE IF NOT EXISTS passkey_challenges (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    challenge TEXT NOT NULL,
    purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('registration', 'authentication')),
    expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE deposits
    ADD COLUMN IF NOT EXISTS fee_kobo BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS credit_amount_kobo BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dedicated_account_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS dedicated_account_reference VARCHAR(100),
    ADD COLUMN IF NOT EXISTS failure_reason TEXT,
    ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

ALTER TABLE vtu_transactions
    ADD COLUMN IF NOT EXISTS provider VARCHAR(30),
    ADD COLUMN IF NOT EXISTS provider_request_id VARCHAR(150);

ALTER TABLE vtu_transactions DROP CONSTRAINT IF EXISTS vtu_transactions_type_check;
ALTER TABLE vtu_transactions ADD CONSTRAINT vtu_transactions_type_check
    CHECK (type IN ('airtime', 'data', 'electricity', 'cable_tv'));

ALTER TABLE wallet_ledger
    ADD COLUMN IF NOT EXISTS deposit_id BIGINT REFERENCES deposits(id) ON DELETE RESTRICT;

ALTER TABLE wallet_ledger DROP CONSTRAINT IF EXISTS wallet_ledger_entry_type_check;
ALTER TABLE wallet_ledger ADD CONSTRAINT wallet_ledger_entry_type_check
    CHECK (entry_type IN ('opening', 'deposit', 'reservation', 'settlement', 'refund', 'commission'));

CREATE TABLE IF NOT EXISTS referral_commission_balances (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance_kobo BIGINT NOT NULL DEFAULT 0 CHECK (balance_kobo >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_commission_ledger (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    entry_type VARCHAR(30) NOT NULL CHECK (entry_type IN ('earned', 'withdrawal')),
    amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
    reference VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referral_commission_ledger_user_idx
    ON referral_commission_ledger(user_id, created_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallet_ledger_single_source_check') THEN
        ALTER TABLE wallet_ledger ADD CONSTRAINT wallet_ledger_single_source_check
            CHECK (transaction_id IS NULL OR deposit_id IS NULL);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_deposit_entry_idx
    ON wallet_ledger(deposit_id, entry_type) WHERE deposit_id IS NOT NULL;

CREATE OR REPLACE FUNCTION protect_terminal_transaction_status()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('success', 'failed') AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'terminal transaction status cannot be changed';
    END IF;
    IF OLD.status = 'pending' AND NEW.status NOT IN ('pending', 'success', 'failed') THEN
        RAISE EXCEPTION 'invalid transaction status transition';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deposits_status_transition_guard ON deposits;
CREATE TRIGGER deposits_status_transition_guard BEFORE UPDATE OF status ON deposits
    FOR EACH ROW EXECUTE FUNCTION protect_terminal_transaction_status();

DROP TRIGGER IF EXISTS vtu_status_transition_guard ON vtu_transactions;
CREATE TRIGGER vtu_status_transition_guard BEFORE UPDATE OF status ON vtu_transactions
    FOR EACH ROW EXECUTE FUNCTION protect_terminal_transaction_status();

CREATE OR REPLACE FUNCTION protect_wallet_ledger()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'wallet ledger entries are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wallet_ledger_immutable_guard ON wallet_ledger;
CREATE TRIGGER wallet_ledger_immutable_guard BEFORE UPDATE OR DELETE ON wallet_ledger
    FOR EACH ROW EXECUTE FUNCTION protect_wallet_ledger();

CREATE OR REPLACE FUNCTION protect_reservation_status()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status <> 'held' OR NEW.status NOT IN ('settled', 'released') THEN
        RAISE EXCEPTION 'invalid wallet reservation transition';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wallet_reservation_transition_guard ON wallet_reservations;
CREATE TRIGGER wallet_reservation_transition_guard BEFORE UPDATE OF status ON wallet_reservations
    FOR EACH ROW EXECUTE FUNCTION protect_reservation_status();
