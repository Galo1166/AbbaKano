ALTER TABLE vtu_transactions
    ADD COLUMN IF NOT EXISTS provider_amount_kobo BIGINT NOT NULL DEFAULT 0
        CHECK (provider_amount_kobo >= 0);

UPDATE vtu_transactions
SET provider_amount_kobo = amount_kobo
WHERE provider_amount_kobo = 0;

CREATE TABLE IF NOT EXISTS admin_mtn_general_data_plans (
    plan_key VARCHAR(12) PRIMARY KEY CHECK (plan_key IN ('500mb', '1gb', '2gb', '3gb', '4gb', '5gb', '10gb')),
    label VARCHAR(30) NOT NULL,
    size_mb INTEGER NOT NULL CHECK (size_mb > 0),
    provider VARCHAR(30),
    provider_code VARCHAR(150),
    provider_label VARCHAR(150),
    provider_price_kobo BIGINT NOT NULL DEFAULT 0 CHECK (provider_price_kobo >= 0),
    selling_price_kobo BIGINT NOT NULL DEFAULT 0 CHECK (selling_price_kobo >= 0),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (NOT enabled OR (provider IS NOT NULL AND provider_code IS NOT NULL AND provider_price_kobo > 0 AND selling_price_kobo > 0))
);

INSERT INTO admin_mtn_general_data_plans (plan_key, label, size_mb) VALUES
    ('500mb', '500 MB', 500),
    ('1gb', '1 GB', 1000),
    ('2gb', '2 GB', 2000),
    ('3gb', '3 GB', 3000),
    ('4gb', '4 GB', 4000),
    ('5gb', '5 GB', 5000),
    ('10gb', '10 GB', 10000)
ON CONFLICT (plan_key) DO UPDATE
SET label = EXCLUDED.label,
    size_mb = EXCLUDED.size_mb;