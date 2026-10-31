ALTER TABLE public.price_overrides
ADD COLUMN IF NOT EXISTS display_capacity TEXT;
