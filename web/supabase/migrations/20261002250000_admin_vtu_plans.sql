CREATE TABLE IF NOT EXISTS public.admin_vtu_plans (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    network TEXT NOT NULL CHECK (network IN ('MTN', 'AIRTEL', 'GLO', '9MOBILE')),
    category TEXT NOT NULL CHECK (category IN ('GENERAL', 'SME', 'GIFTING', 'DIRECT')),
    capacity_mb INTEGER NOT NULL CHECK (capacity_mb > 0 AND capacity_mb <= 1000000),
    duration TEXT NOT NULL CHECK (duration IN ('daily', 'weekly', 'monthly')),
    price_kobo BIGINT NOT NULL CHECK (price_kobo > 0 AND price_kobo <= 100000000),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_vtu_plans_lookup_idx
    ON public.admin_vtu_plans(network, category, enabled, capacity_mb);

ALTER TABLE public.admin_vtu_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_vtu_plans FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.admin_vtu_plans FROM service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_vtu_plans TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.admin_vtu_plans_id_seq TO service_role;
