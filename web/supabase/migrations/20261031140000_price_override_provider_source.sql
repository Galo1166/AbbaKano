ALTER TABLE public.price_overrides
ADD COLUMN IF NOT EXISTS source_provider TEXT NOT NULL DEFAULT 'VTUGATE';

UPDATE public.price_overrides
SET source_provider = 'ALRAHUZDATA'
WHERE provider IN ('MTN', 'AIRTEL', 'GLO', '9MOBILE');

DROP INDEX IF EXISTS public.price_overrides_provider_plan_code_idx;

CREATE UNIQUE INDEX IF NOT EXISTS price_overrides_provider_source_plan_code_idx
ON public.price_overrides(provider, source_provider, plan_code);
