-- Pause new referral awards without interrupting account registration.
-- `award_referral_signup_commission` returns `referral_disabled`, which the
-- registration flow treats as a successful, non-rewarded registration.
UPDATE public.referral_program_settings
SET enabled = FALSE,
    updated_at = now()
WHERE id = TRUE;
