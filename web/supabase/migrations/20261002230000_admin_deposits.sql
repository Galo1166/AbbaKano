CREATE OR REPLACE FUNCTION public.get_admin_deposits(
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 20,
    p_status TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_page INTEGER := greatest(coalesce(p_page, 1), 1);
    v_page_size INTEGER := least(greatest(coalesce(p_page_size, 20), 1), 100);
    v_status TEXT := nullif(lower(trim(p_status)), '');
    v_search TEXT := nullif(trim(p_search), '');
    v_deposits JSONB;
    v_total BIGINT;
    v_total_count BIGINT;
    v_total_amount_kobo BIGINT;
    v_settled_amount_kobo BIGINT;
    v_failed BIGINT;
BEGIN
    IF v_status IS NOT NULL AND v_status NOT IN ('pending', 'success', 'failed') THEN
        RAISE EXCEPTION 'Unsupported deposit status filter.';
    END IF;

    SELECT
        count(*),
        coalesce(sum(deposit.amount_kobo), 0),
        coalesce(sum(deposit.amount_kobo) FILTER (WHERE lower(deposit.status) = 'success'), 0),
        count(*) FILTER (WHERE lower(deposit.status) = 'failed')
    INTO v_total_count, v_total_amount_kobo, v_settled_amount_kobo, v_failed
    FROM public.deposits deposit;

    WITH matching_deposits AS (
        SELECT
            deposit.id,
            deposit.reference,
            deposit.provider_reference,
            deposit.amount_kobo,
            deposit.status,
            deposit.created_at,
            deposit.metadata,
            profile.full_name,
            profile.phone,
            auth_user.email
        FROM public.deposits deposit
        LEFT JOIN public.profiles profile ON profile.id = deposit.user_id
        LEFT JOIN auth.users auth_user ON auth_user.id = deposit.user_id
        WHERE (
            v_status IS NULL
            OR lower(deposit.status) = v_status
        )
          AND (
            v_search IS NULL
            OR position(lower(v_search) IN lower(concat_ws(
                ' ',
                deposit.reference,
                deposit.provider_reference,
                profile.full_name,
                profile.phone,
                auth_user.email,
                deposit.metadata->>'dedicated_account_number',
                deposit.metadata->>'virtual_account_number'
            ))) > 0
        )
    ),
    filtered_count AS (
        SELECT count(*) AS total FROM matching_deposits
    ),
    page_deposits AS (
        SELECT *
        FROM matching_deposits
        ORDER BY created_at DESC, id DESC
        LIMIT v_page_size
        OFFSET (v_page - 1) * v_page_size
    )
    SELECT
        filtered_count.total,
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'id', page_deposits.id::TEXT,
                    'customer_name', coalesce(nullif(trim(page_deposits.full_name), ''), nullif(trim(page_deposits.phone), ''), 'Customer'),
                    'customer_phone', coalesce(page_deposits.phone, ''),
                    'virtual_account', coalesce(
                        nullif(page_deposits.metadata->>'dedicated_account_number', ''),
                        nullif(page_deposits.metadata->>'virtual_account_number', ''),
                        'Not recorded'
                    ),
                    'bank_name', coalesce(
                        nullif(page_deposits.metadata->>'virtual_account_bank_name', ''),
                        nullif(page_deposits.metadata->>'bank_name', ''),
                        'Bank source unavailable'
                    ),
                    'bank_reference', coalesce(nullif(page_deposits.provider_reference, ''), page_deposits.reference),
                    'session_reference', coalesce(
                        nullif(page_deposits.metadata->>'dedicated_account_reference', ''),
                        nullif(page_deposits.provider_reference, ''),
                        page_deposits.reference
                    ),
                    'amount', page_deposits.amount_kobo / 100.0,
                    'status', lower(page_deposits.status),
                    'created_at', page_deposits.created_at,
                    'settled_at', page_deposits.created_at
                )
                ORDER BY page_deposits.created_at DESC, page_deposits.id DESC
            ) FILTER (WHERE page_deposits.id IS NOT NULL),
            '[]'::jsonb
        )
    INTO v_total, v_deposits
    FROM filtered_count
    LEFT JOIN page_deposits ON true
    GROUP BY filtered_count.total;

    RETURN jsonb_build_object(
        'deposits', v_deposits,
        'total', v_total,
        'page', v_page,
        'pageSize', v_page_size,
        'metrics', jsonb_build_object(
            'totalCount', v_total_count,
            'totalAmount', v_total_amount_kobo / 100.0,
            'settledAmount', v_settled_amount_kobo / 100.0,
            'failedCount', v_failed
        )
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_deposits(INTEGER, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_deposits(INTEGER, INTEGER, TEXT, TEXT) TO service_role;
