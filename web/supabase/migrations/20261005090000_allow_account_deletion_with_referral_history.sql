ALTER TABLE public.referral_commission_ledger
    ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.referral_commission_ledger
    DROP CONSTRAINT IF EXISTS referral_commission_ledger_user_id_fkey;

ALTER TABLE public.referral_commission_ledger
    ADD CONSTRAINT referral_commission_ledger_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;
