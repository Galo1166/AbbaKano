ALTER TABLE public.admin_vtu_plans
    ADD COLUMN IF NOT EXISTS capacity TEXT;

UPDATE public.admin_vtu_plans
SET capacity = CASE
    WHEN capacity_mb >= 1000 THEN
        CASE
            WHEN capacity_mb % 1000 = 0 THEN (capacity_mb / 1000)::TEXT || 'GB'
            ELSE capacity_mb::TEXT || 'MB'
        END
    ELSE capacity_mb::TEXT || 'MB'
END
WHERE capacity IS NULL OR btrim(capacity) = '';

ALTER TABLE public.admin_vtu_plans
    ALTER COLUMN capacity SET NOT NULL;
