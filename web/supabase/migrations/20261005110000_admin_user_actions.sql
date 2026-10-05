CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_admin_adjustment_id_idx
    ON public.wallet_ledger ((metadata->>'adjustment_id'))
    WHERE metadata ? 'adjustment_id';

CREATE OR REPLACE FUNCTION public.admin_adjust_user_wallet(
    p_user_id UUID,
    p_admin_user_id UUID,
    p_amount_kobo BIGINT,
    p_direction TEXT,
    p_reason TEXT,
    p_adjustment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_wallet public.wallets%ROWTYPE;
    v_profile public.profiles%ROWTYPE;
    v_existing public.wallet_ledger%ROWTYPE;
    v_held_kobo BIGINT;
    v_balance_after BIGINT;
    v_signed_amount BIGINT;
BEGIN
    IF p_amount_kobo <= 0 OR p_amount_kobo > 1000000000000 THEN
        RAISE EXCEPTION 'Enter a valid adjustment amount';
    END IF;
    IF p_direction NOT IN ('credit', 'debit') THEN
        RAISE EXCEPTION 'Adjustment direction must be credit or debit';
    END IF;
    IF length(trim(coalesce(p_reason, ''))) = 0 OR length(trim(p_reason)) > 500 THEN
        RAISE EXCEPTION 'Enter a reason for the wallet adjustment';
    END IF;
    IF p_adjustment_id IS NULL THEN
        RAISE EXCEPTION 'Adjustment reference is required';
    END IF;

    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = p_user_id
      AND lower(coalesce(role::TEXT, 'user')) = 'user';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer account not found';
    END IF;

    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer wallet not found';
    END IF;

    SELECT * INTO v_existing
    FROM public.wallet_ledger
    WHERE metadata->>'adjustment_id' = p_adjustment_id::TEXT;
    IF FOUND THEN
        IF v_existing.user_id <> p_user_id
           OR v_existing.metadata->>'admin_user_id' <> p_admin_user_id::TEXT
           OR v_existing.metadata->>'direction' <> p_direction
           OR v_existing.amount_kobo <> (
               CASE WHEN p_direction = 'credit' THEN p_amount_kobo ELSE -p_amount_kobo END
           ) THEN
            RAISE EXCEPTION 'Adjustment reference has already been used';
        END IF;
        RETURN jsonb_build_object(
            'balance_kobo', v_wallet.balance_kobo,
            'adjustment_id', p_adjustment_id
        );
    END IF;

    IF p_direction = 'debit' THEN
        SELECT coalesce(sum(amount_kobo), 0) INTO v_held_kobo
        FROM public.wallet_reservations
        WHERE wallet_id = v_wallet.id AND status = 'held';
        IF v_wallet.balance_kobo - v_held_kobo < p_amount_kobo THEN
            RAISE EXCEPTION 'Debit exceeds the customer available wallet balance';
        END IF;
        v_signed_amount := -p_amount_kobo;
    ELSE
        v_signed_amount := p_amount_kobo;
    END IF;

    v_balance_after := v_wallet.balance_kobo + v_signed_amount;
    UPDATE public.wallets
    SET balance_kobo = v_balance_after, updated_at = now()
    WHERE id = v_wallet.id;

    INSERT INTO public.wallet_ledger (
        user_id, wallet_id, entry_type, amount_kobo,
        balance_before_kobo, balance_after_kobo, description, metadata
    )
    VALUES (
        p_user_id, v_wallet.id, 'adjustment', v_signed_amount,
        v_wallet.balance_kobo, v_balance_after, trim(p_reason),
        jsonb_build_object(
            'adjustment_id', p_adjustment_id,
            'admin_user_id', p_admin_user_id,
            'direction', p_direction
        )
    );

    RETURN jsonb_build_object(
        'balance_kobo', v_balance_after,
        'adjustment_id', p_adjustment_id
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_adjust_user_wallet(UUID, UUID, BIGINT, TEXT, TEXT, UUID)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_user_wallet(UUID, UUID, BIGINT, TEXT, TEXT, UUID)
    TO service_role;
