CREATE TABLE IF NOT EXISTS users (
	id BIGSERIAL PRIMARY KEY,
	username VARCHAR(50) NOT NULL UNIQUE,
	full_name VARCHAR(120),
	phone VARCHAR(20),
	biometrics_enabled BOOLEAN NOT NULL DEFAULT TRUE,
	app_lock_enabled BOOLEAN NOT NULL DEFAULT FALSE,
	email VARCHAR(255) UNIQUE,
	password_hash TEXT NOT NULL,
	role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
	status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
	dedicated_account_number VARCHAR(50),
	dedicated_account_reference VARCHAR(100),
	virtual_account_provider VARCHAR(30),
	virtual_account_number VARCHAR(20),
	virtual_account_bank_name VARCHAR(120),
	virtual_account_name VARCHAR(120),
	virtual_account_reference VARCHAR(150),
	virtual_account_status VARCHAR(20) CHECK (virtual_account_status IN ('pending', 'active', 'failed')),
	virtual_account_error TEXT,
	virtual_account_created_at TIMESTAMPTZ,
	transaction_pin_hash TEXT,
	transaction_pin_salt TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dedicated_account_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS dedicated_account_reference VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS virtual_account_provider VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS virtual_account_number VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS virtual_account_bank_name VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS virtual_account_name VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS virtual_account_reference VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS virtual_account_status VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS virtual_account_error TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS virtual_account_created_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS transaction_pin_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS transaction_pin_salt TEXT;
ALTER TABLE users ALTER COLUMN app_lock_enabled SET DEFAULT FALSE;
UPDATE users SET role = 'admin' WHERE username = 'Admin';
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique_idx ON users(phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_virtual_account_number_idx ON users(virtual_account_number) WHERE virtual_account_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS agent_profiles (
	user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'suspended')),
	daily_limit_kobo BIGINT NOT NULL DEFAULT 50000000 CHECK (daily_limit_kobo > 0),
	verified_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
	verified_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_profiles_status_idx ON agent_profiles(status);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS wallet_balance_kobo BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS deposits (
	 id BIGSERIAL PRIMARY KEY,
	 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	 reference VARCHAR(100) NOT NULL UNIQUE,
	 amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
	 fee_kobo BIGINT NOT NULL DEFAULT 0 CHECK (fee_kobo >= 0),
	 credit_amount_kobo BIGINT NOT NULL DEFAULT 0 CHECK (credit_amount_kobo >= 0),
	 dedicated_account_number VARCHAR(50),
	 dedicated_account_reference VARCHAR(100),
	 status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
	 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	verified_at TIMESTAMPTZ
);

ALTER TABLE deposits
	ADD COLUMN IF NOT EXISTS failure_reason TEXT,
	ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS deposits_user_id_idx ON deposits(user_id);

CREATE TABLE IF NOT EXISTS vtu_transactions (
	id BIGSERIAL PRIMARY KEY,
	user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	reference VARCHAR(100) NOT NULL UNIQUE,
	provider VARCHAR(30),
	provider_request_id VARCHAR(150),
	provider_reference VARCHAR(100),
	type VARCHAR(20) NOT NULL CHECK (type IN ('airtime', 'data', 'electricity', 'cable_tv')),
	network VARCHAR(30) NOT NULL,
	phone VARCHAR(20) NOT NULL,
	plan_code VARCHAR(100),
	amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
	status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
	failure_reason TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS vtu_transactions_user_id_idx ON vtu_transactions(user_id);

ALTER TABLE vtu_transactions
	ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100),
	ADD COLUMN IF NOT EXISTS request_hash VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS vtu_transactions_idempotency_idx
	ON vtu_transactions(user_id, type, idempotency_key)
	WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS wallets (
	user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	balance_kobo BIGINT NOT NULL DEFAULT 0 CHECK (balance_kobo >= 0),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO wallets (user_id, balance_kobo)
SELECT id, wallet_balance_kobo
FROM users
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS wallet_ledger (
	id BIGSERIAL PRIMARY KEY,
	user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
	transaction_id BIGINT REFERENCES vtu_transactions(id) ON DELETE RESTRICT,
	deposit_id BIGINT REFERENCES deposits(id) ON DELETE RESTRICT,
	entry_type VARCHAR(30) NOT NULL CHECK (entry_type IN ('opening', 'deposit', 'reservation', 'settlement', 'refund')),
	amount_kobo BIGINT NOT NULL CHECK (amount_kobo <> 0),
	balance_after_kobo BIGINT NOT NULL CHECK (balance_after_kobo >= 0),
	idempotency_key VARCHAR(100),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE wallet_ledger ADD COLUMN IF NOT EXISTS deposit_id BIGINT REFERENCES deposits(id) ON DELETE RESTRICT;

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallet_ledger_single_source_check') THEN
		ALTER TABLE wallet_ledger ADD CONSTRAINT wallet_ledger_single_source_check
			CHECK (transaction_id IS NULL OR deposit_id IS NULL);
	END IF;
END $$;

CREATE INDEX IF NOT EXISTS wallet_ledger_user_id_idx ON wallet_ledger(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_idempotency_key_idx ON wallet_ledger(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_transaction_entry_idx
	ON wallet_ledger(transaction_id, entry_type)
	WHERE transaction_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_deposit_entry_idx
	ON wallet_ledger(deposit_id, entry_type)
	WHERE deposit_id IS NOT NULL;

INSERT INTO wallet_ledger (user_id, entry_type, amount_kobo, balance_after_kobo)
SELECT w.user_id, 'opening', w.balance_kobo, w.balance_kobo
FROM wallets w
WHERE w.balance_kobo > 0
  AND NOT EXISTS (
	  SELECT 1 FROM wallet_ledger l
	  WHERE l.user_id = w.user_id AND l.entry_type = 'opening'
  );

CREATE TABLE IF NOT EXISTS wallet_reservations (
	transaction_id BIGINT PRIMARY KEY REFERENCES vtu_transactions(id) ON DELETE RESTRICT,
	user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
	amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
	status VARCHAR(20) NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'settled', 'released')),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
	user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	operation VARCHAR(50) NOT NULL,
	idempotency_key VARCHAR(100) NOT NULL,
	request_hash VARCHAR(64) NOT NULL,
	status VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'success', 'failed', 'pending')),
	response_json JSONB,
	transaction_id BIGINT REFERENCES vtu_transactions(id) ON DELETE SET NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (user_id, operation, idempotency_key)
);

CREATE TABLE IF NOT EXISTS audit_logs (
	id BIGSERIAL PRIMARY KEY,
	user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
	transaction_id BIGINT REFERENCES vtu_transactions(id) ON DELETE SET NULL,
	action VARCHAR(60) NOT NULL,
	details JSONB NOT NULL DEFAULT '{}'::jsonb,
	ip_address INET,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_transaction_idx ON audit_logs(transaction_id, created_at DESC);

CREATE TABLE IF NOT EXISTS fraud_events (
	id BIGSERIAL PRIMARY KEY,
	user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
	operation VARCHAR(50) NOT NULL,
	risk_score INTEGER NOT NULL CHECK (risk_score >= 0),
	reason_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
	ip_address INET,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fraud_events_user_idx ON fraud_events(user_id, created_at DESC);

ALTER TABLE vtu_transactions
	ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Monetary records are append-only.  These guards prevent accidental state
-- regression and make an invalid reservation lifecycle fail at the database.
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
CREATE TRIGGER deposits_status_transition_guard
	BEFORE UPDATE OF status ON deposits
	FOR EACH ROW EXECUTE FUNCTION protect_terminal_transaction_status();

DROP TRIGGER IF EXISTS vtu_status_transition_guard ON vtu_transactions;
CREATE TRIGGER vtu_status_transition_guard
	BEFORE UPDATE OF status ON vtu_transactions
	FOR EACH ROW EXECUTE FUNCTION protect_terminal_transaction_status();

CREATE OR REPLACE FUNCTION protect_wallet_ledger()
RETURNS TRIGGER AS $$
BEGIN
	RAISE EXCEPTION 'wallet ledger entries are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wallet_ledger_immutable_guard ON wallet_ledger;
CREATE TRIGGER wallet_ledger_immutable_guard
	BEFORE UPDATE OR DELETE ON wallet_ledger
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
CREATE TRIGGER wallet_reservation_transition_guard
	BEFORE UPDATE OF status ON wallet_reservations
	FOR EACH ROW EXECUTE FUNCTION protect_reservation_status();
