CREATE TABLE public.referral_program_settings (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    signup_reward_kobo BIGINT NOT NULL DEFAULT 10000
        CHECK (signup_reward_kobo > 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.referral_program_settings (id)
VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.referral_program_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.award_referral_signup_commission(
    p_referred_user_id UUID,
    p_referral_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_referred_profile public.profiles%ROWTYPE;
    v_referrer_id UUID;
    v_referral_digits TEXT;
    v_reference TEXT;
    v_balance_kobo BIGINT;
    v_referrals_enabled BOOLEAN;
    v_signup_reward_kobo BIGINT;
BEGIN
    SELECT enabled, signup_reward_kobo
    INTO v_referrals_enabled, v_signup_reward_kobo
    FROM public.referral_program_settings
    WHERE id = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Referral program settings are not configured';
    END IF;
    IF NOT v_referrals_enabled THEN
        RETURN jsonb_build_object('status', 'referral_disabled');
    END IF;

    v_referral_digits := regexp_replace(coalesce(p_referral_phone, ''), '[^0-9]', '', 'g');
    IF v_referral_digits = '' THEN
        RETURN jsonb_build_object('status', 'no_referral');
    END IF;
    IF v_referral_digits LIKE '234%' THEN
        v_referral_digits := '0' || substr(v_referral_digits, 4);
    END IF;

    SELECT * INTO v_referred_profile
    FROM public.profiles
    WHERE id = p_referred_user_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'New profile not found';
    END IF;

    IF v_referred_profile.referrer_user_id IS NOT NULL THEN
        RETURN jsonb_build_object('status', 'already_referred');
    END IF;

    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE id <> p_referred_user_id
      AND (
        regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = v_referral_digits
        OR regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') =
            CASE
                WHEN v_referral_digits LIKE '0%' THEN '234' || substr(v_referral_digits, 2)
                ELSE v_referral_digits
            END
      )
    ORDER BY created_at
    LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'invalid_referral');
    END IF;

    UPDATE public.profiles
    SET referrer_user_id = v_referrer_id
    WHERE id = p_referred_user_id;

    v_reference := 'referral_' || v_referrer_id::TEXT || '_' ||
        p_referred_user_id::TEXT;

    INSERT INTO public.referral_commission_balances (user_id, balance_kobo)
    VALUES (v_referrer_id, v_signup_reward_kobo)
    ON CONFLICT (user_id) DO UPDATE
    SET balance_kobo = public.referral_commission_balances.balance_kobo + v_signup_reward_kobo,
        updated_at = now()
    RETURNING balance_kobo INTO v_balance_kobo;

    INSERT INTO public.referral_commission_ledger (
        user_id, referred_user_id, entry_type, amount_kobo, reference
    )
    VALUES (
        v_referrer_id, p_referred_user_id, 'earned', v_signup_reward_kobo, v_reference
    );

    RETURN jsonb_build_object(
        'status', 'credited',
        'amount_kobo', v_signup_reward_kobo,
        'balance_kobo', v_balance_kobo
    );
END;
$function$;
