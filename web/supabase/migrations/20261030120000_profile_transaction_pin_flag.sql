ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_transaction_pin BOOLEAN
GENERATED ALWAYS AS (
  transaction_pin_hash IS NOT NULL AND transaction_pin_salt IS NOT NULL
) STORED;