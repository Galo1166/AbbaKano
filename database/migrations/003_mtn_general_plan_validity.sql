ALTER TABLE admin_mtn_general_data_plans
    ADD COLUMN IF NOT EXISTS validity_period VARCHAR(12) NOT NULL DEFAULT 'monthly';

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'admin_mtn_general_data_plans'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%provider%'
    LOOP
        EXECUTE format('ALTER TABLE admin_mtn_general_data_plans DROP CONSTRAINT %I', constraint_name);
    END LOOP;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'admin_mtn_general_data_plans'::regclass
          AND conname = 'admin_mtn_general_plan_validity_check'
    ) THEN
        ALTER TABLE admin_mtn_general_data_plans
            ADD CONSTRAINT admin_mtn_general_plan_validity_check
            CHECK (validity_period IN ('daily', 'weekly', 'monthly'));
    END IF;
END $$;

UPDATE admin_mtn_general_data_plans
SET provider = NULL,
    provider_code = NULL,
    provider_label = NULL,
    provider_price_kobo = 0,
    enabled = FALSE,
    validity_period = COALESCE(validity_period, 'monthly');