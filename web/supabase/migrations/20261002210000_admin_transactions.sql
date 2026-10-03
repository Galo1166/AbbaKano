CREATE OR REPLACE FUNCTION public.get_admin_transactions(
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 15,
    p_status TEXT DEFAULT NULL,
    p_carrier TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_page INTEGER := greatest(coalesce(p_page, 1), 1);
    v_page_size INTEGER := least(greatest(coalesce(p_page_size, 15), 1), 100);
    v_status TEXT := nullif(upper(trim(p_status)), '');
    v_carrier TEXT := nullif(upper(trim(p_carrier)), '');
    v_search TEXT := nullif(trim(p_search), '');
    v_total BIGINT;
    v_stalled_disputed BIGINT;
    v_refunded BIGINT;
    v_queued BIGINT;
    v_transactions JSONB;
BEGIN
    SELECT
        count(*),
        count(*) FILTER (WHERE lower(vt.status) IN ('failed', 'pending', 'processing')),
        count(*) FILTER (WHERE lower(vt.status) = 'refunded'),
        count(*) FILTER (WHERE lower(vt.status) IN ('pending', 'processing'))
    INTO v_total, v_stalled_disputed, v_refunded, v_queued
    FROM public.vtu_transactions vt
    LEFT JOIN public.profiles profile ON profile.id = vt.user_id
    WHERE (
        v_status IS NULL
        OR (v_status = 'PENDING' AND lower(vt.status) IN ('pending', 'processing'))
        OR lower(vt.status) = lower(v_status)
    )
      AND (
        v_carrier IS NULL
        OR upper(coalesce(nullif(trim(vt.network), ''), nullif(trim(vt.service_provider), ''), 'VTUGATE')) = v_carrier
    )
      AND (
        v_search IS NULL
        OR position(lower(v_search) IN lower(concat_ws(
            ' ',
            vt.id::TEXT,
            vt.phone_number,
            vt.account_number,
            profile.full_name,
            profile.phone
        ))) > 0
    );

    SELECT coalesce(
        jsonb_agg(
            jsonb_build_object(
                'id', vt.id::TEXT,
                'type', vt.transaction_type,
                'plan', coalesce(vt.metadata->>'plan_label', vt.transaction_type),
                'network', vt.network,
                'phone', coalesce(vt.phone_number, vt.account_number, ''),
                'amount', vt.amount_kobo / 100.0,
                'status', vt.status,
                'provider', vt.provider,
                'created_at', vt.created_at,
                'username', coalesce(profile.full_name, profile.phone, 'Customer')
            )
            ORDER BY vt.created_at DESC, vt.id DESC
        ),
        '[]'::jsonb
    )
    INTO v_transactions
    FROM (
        SELECT vt.*
        FROM public.vtu_transactions vt
        LEFT JOIN public.profiles profile ON profile.id = vt.user_id
        WHERE (
            v_status IS NULL
            OR (v_status = 'PENDING' AND lower(vt.status) IN ('pending', 'processing'))
            OR lower(vt.status) = lower(v_status)
        )
          AND (
            v_carrier IS NULL
            OR upper(coalesce(nullif(trim(vt.network), ''), nullif(trim(vt.service_provider), ''), 'VTUGATE')) = v_carrier
        )
          AND (
            v_search IS NULL
            OR position(lower(v_search) IN lower(concat_ws(
                ' ',
                vt.id::TEXT,
                vt.phone_number,
                vt.account_number,
                profile.full_name,
                profile.phone
            ))) > 0
        )
        ORDER BY vt.created_at DESC, vt.id DESC
        LIMIT v_page_size
        OFFSET (v_page - 1) * v_page_size
    ) vt
    LEFT JOIN public.profiles profile ON profile.id = vt.user_id;

    RETURN jsonb_build_object(
        'transactions', v_transactions,
        'total', v_total,
        'metrics', jsonb_build_object(
            'stalledDisputed', v_stalled_disputed,
            'refunded', v_refunded,
            'queued', v_queued
        )
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_transactions(INTEGER, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_transactions(INTEGER, INTEGER, TEXT, TEXT, TEXT) TO service_role;
