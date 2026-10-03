CREATE OR REPLACE FUNCTION public.create_electricity_reservation(
    p_user_id UUID,
    p_provider TEXT,
    p_phone_number TEXT,
    p_meter_number TEXT,
    p_plan_code TEXT,
    p_plan_label TEXT,
    p_amount_kobo BIGINT,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_wallet public.wallets%ROWTYPE;
    v_transaction public.vtu_transactions%ROWTYPE;
    v_reservation public.wallet_reservations%ROWTYPE;
    v_held_kobo BIGINT;
    v_available_kobo BIGINT;
BEGIN
    IF upper(p_provider) NOT IN ('AEDC', 'IKEDC', 'KEDCO', 'PHED', 'JED')
       OR p_phone_number !~ '^0[0-9]{10}$'
       OR p_meter_number !~ '^[0-9]{8,14}$'
       OR p_plan_code !~ '^[0-9]+:prepaid$'
       OR p_plan_label <> 'Prepaid electricity'
       OR p_amount_kobo < 5000
       OR p_amount_kobo > 10000000 THEN
        RAISE EXCEPTION 'Invalid electricity purchase';
    END IF;
    IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
        RAISE EXCEPTION 'Idempotency key is required';
    END IF;

    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found';
    END IF;

    SELECT * INTO v_transaction
    FROM public.vtu_transactions
    WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key
    FOR UPDATE;
    IF FOUND THEN
        IF v_transaction.transaction_type <> 'electricity' THEN
            RAISE EXCEPTION 'Idempotency key belongs to another transaction type';
        END IF;
        SELECT * INTO v_reservation
        FROM public.wallet_reservations
        WHERE transaction_id = v_transaction.id;
        RETURN jsonb_build_object(
            'status', 'already_exists',
            'transaction_id', v_transaction.id,
            'transaction_status', v_transaction.status,
            'reservation_status', v_reservation.status,
            'provider_reference', v_transaction.provider_reference
        );
    END IF;

    SELECT coalesce(sum(amount_kobo), 0) INTO v_held_kobo
    FROM public.wallet_reservations
    WHERE wallet_id = v_wallet.id AND status = 'held';
    v_available_kobo := v_wallet.balance_kobo - v_held_kobo;
    IF v_available_kobo < p_amount_kobo THEN
        RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;

    INSERT INTO public.vtu_transactions (
        user_id, transaction_type, network, service_provider, phone_number,
        account_number, amount_kobo, status, provider, attempt_count,
        idempotency_key, metadata
    )
    VALUES (
        p_user_id, 'electricity', upper(p_provider), 'vtugate', p_phone_number,
        p_meter_number, p_amount_kobo, 'processing', 'vtugate', 1,
        p_idempotency_key,
        jsonb_build_object(
            'plan_code', p_plan_code,
            'plan_label', p_plan_label,
            'meter_number', p_meter_number,
            'source', 'web'
        )
    )
    RETURNING * INTO v_transaction;

    INSERT INTO public.wallet_reservations (
        user_id, wallet_id, transaction_id, amount_kobo, status
    )
    VALUES (
        p_user_id, v_wallet.id, v_transaction.id, p_amount_kobo, 'held'
    )
    RETURNING * INTO v_reservation;

    RETURN jsonb_build_object(
        'status', 'created',
        'transaction_id', v_transaction.id,
        'reservation_id', v_reservation.id,
        'amount_kobo', p_amount_kobo,
        'available_balance_kobo', v_available_kobo
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.settle_electricity_purchase(
    p_transaction_id BIGINT,
    p_provider_reference TEXT,
    p_provider_response JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_transaction public.vtu_transactions%ROWTYPE;
    v_reservation public.wallet_reservations%ROWTYPE;
    v_wallet public.wallets%ROWTYPE;
    v_balance_before BIGINT;
    v_balance_after BIGINT;
BEGIN
    SELECT * INTO v_transaction
    FROM public.vtu_transactions
    WHERE id = p_transaction_id
    FOR UPDATE;
    IF NOT FOUND OR v_transaction.transaction_type <> 'electricity' THEN
        RAISE EXCEPTION 'Electricity transaction not found';
    END IF;

    SELECT * INTO v_reservation
    FROM public.wallet_reservations
    WHERE transaction_id = p_transaction_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet reservation not found';
    END IF;

    IF v_reservation.status = 'settled' THEN
        SELECT * INTO v_wallet
        FROM public.wallets
        WHERE id = v_reservation.wallet_id;
        RETURN jsonb_build_object(
            'status', 'already_settled',
            'transaction_id', p_transaction_id,
            'balance_kobo', v_wallet.balance_kobo
        );
    END IF;
    IF v_reservation.status <> 'held' OR v_transaction.status <> 'processing' THEN
        RAISE EXCEPTION 'Electricity purchase is not awaiting settlement';
    END IF;

    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE id = v_reservation.wallet_id
    FOR UPDATE;
    IF NOT FOUND OR v_wallet.balance_kobo < v_reservation.amount_kobo THEN
        RAISE EXCEPTION 'Insufficient wallet balance during settlement';
    END IF;

    v_balance_before := v_wallet.balance_kobo;
    v_balance_after := v_balance_before - v_reservation.amount_kobo;

    UPDATE public.wallets
    SET balance_kobo = v_balance_after, updated_at = now()
    WHERE id = v_wallet.id;

    INSERT INTO public.wallet_ledger (
        user_id, wallet_id, transaction_id, entry_type, amount_kobo,
        balance_before_kobo, balance_after_kobo, description, metadata
    )
    VALUES (
        v_transaction.user_id, v_wallet.id, p_transaction_id, 'purchase',
        -v_reservation.amount_kobo, v_balance_before, v_balance_after,
        v_transaction.metadata->>'plan_label',
        jsonb_build_object(
            'network', v_transaction.network,
            'phone_number', v_transaction.phone_number,
            'account_number', v_transaction.account_number,
            'provider', v_transaction.provider,
            'provider_reference', p_provider_reference,
            'plan_code', v_transaction.metadata->>'plan_code',
            'plan_label', v_transaction.metadata->>'plan_label'
        )
    );

    UPDATE public.wallet_reservations
    SET status = 'settled', updated_at = now()
    WHERE id = v_reservation.id;

    UPDATE public.vtu_transactions
    SET status = 'success',
        provider_reference = p_provider_reference,
        provider_response = p_provider_response,
        updated_at = now()
    WHERE id = p_transaction_id;

    RETURN jsonb_build_object(
        'status', 'settled',
        'transaction_id', p_transaction_id,
        'balance_before_kobo', v_balance_before,
        'balance_after_kobo', v_balance_after
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_electricity_reservation(
    p_transaction_id BIGINT,
    p_provider_response JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_transaction public.vtu_transactions%ROWTYPE;
    v_reservation public.wallet_reservations%ROWTYPE;
BEGIN
    SELECT * INTO v_transaction
    FROM public.vtu_transactions
    WHERE id = p_transaction_id
    FOR UPDATE;
    IF NOT FOUND OR v_transaction.transaction_type <> 'electricity' THEN
        RAISE EXCEPTION 'Electricity transaction not found';
    END IF;

    SELECT * INTO v_reservation
    FROM public.wallet_reservations
    WHERE transaction_id = p_transaction_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet reservation not found';
    END IF;

    IF v_reservation.status = 'released' AND v_transaction.status = 'failed' THEN
        RETURN;
    END IF;
    IF v_reservation.status <> 'held' OR v_transaction.status <> 'processing' THEN
        RAISE EXCEPTION 'Electricity reservation cannot be released';
    END IF;

    UPDATE public.wallet_reservations
    SET status = 'released', updated_at = now()
    WHERE id = v_reservation.id;
    UPDATE public.vtu_transactions
    SET status = 'failed',
        provider_response = p_provider_response,
        updated_at = now()
    WHERE id = p_transaction_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_electricity_reservation(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_electricity_purchase(BIGINT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_electricity_reservation(BIGINT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_electricity_reservation(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_electricity_purchase(BIGINT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_electricity_reservation(BIGINT, JSONB) TO service_role;
