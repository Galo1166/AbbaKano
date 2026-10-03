CREATE OR REPLACE FUNCTION public.get_admin_overview_snapshot(p_days INTEGER DEFAULT 1)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_days INTEGER := least(greatest(coalesce(p_days, 1), 1), 30);
    v_total_users BIGINT;
    v_active_users BIGINT;
    v_new_users_today BIGINT;
    v_transactions_today BIGINT;
    v_sales_today BIGINT;
    v_deposits_today BIGINT;
    v_transaction_count BIGINT;
    v_success_count BIGINT;
    v_carrier_breakdown JSONB;
    v_recent_transactions JSONB;
    v_trend JSONB;
    v_overview JSONB;
BEGIN
    SELECT
        count(*),
        count(*) FILTER (WHERE lower(coalesce(status, 'active')) = 'active'),
        count(*) FILTER (WHERE created_at >= date_trunc('day', now()))
    INTO v_total_users, v_active_users, v_new_users_today
    FROM public.profiles
    WHERE coalesce(role, 'user') = 'user';

    SELECT
        count(*) FILTER (WHERE created_at >= date_trunc('day', now())),
        coalesce(sum(amount_kobo) FILTER (
            WHERE created_at >= date_trunc('day', now()) AND status = 'success'
        ), 0),
        count(*) FILTER (WHERE created_at >= date_trunc('day', now())),
        count(*) FILTER (
            WHERE created_at >= date_trunc('day', now()) AND status = 'success'
        )
    INTO v_transactions_today, v_sales_today, v_transaction_count, v_success_count
    FROM public.vtu_transactions;

    SELECT coalesce(sum(amount_kobo), 0)
    INTO v_deposits_today
    FROM public.deposits
    WHERE created_at >= date_trunc('day', now())
      AND status = 'success';

    SELECT coalesce(
        jsonb_object_agg(
            carrier,
            jsonb_build_object(
                'amount', amount_kobo / 100.0,
                'percentage', CASE
                    WHEN total_kobo > 0 THEN round(amount_kobo * 100.0 / total_kobo)::INTEGER
                    ELSE 0
                END
            )
        ),
        '{}'::jsonb
    )
    INTO v_carrier_breakdown
    FROM (
        WITH known_carriers AS (
            SELECT unnest(ARRAY[
                'MTN', 'AIRTEL', 'GLO', '9MOBILE', 'AEDC', 'IKEDC',
                'KEDCO', 'PHED', 'JED', 'DSTV', 'GOTV', 'STARTIMES', 'VTUGATE'
            ]) AS carrier
        ),
        carrier_totals AS (
            SELECT
                upper(coalesce(nullif(trim(network), ''), nullif(trim(service_provider), ''), 'VTUGATE')) AS carrier,
                sum(amount_kobo) AS amount_kobo
            FROM public.vtu_transactions
            WHERE status = 'success'
            GROUP BY 1
        ),
        carriers AS (
            SELECT carrier FROM known_carriers
            UNION
            SELECT carrier FROM carrier_totals
        )
        SELECT
            carriers.carrier,
            coalesce(carrier_totals.amount_kobo, 0) AS amount_kobo,
            sum(coalesce(carrier_totals.amount_kobo, 0)) OVER () AS total_kobo
        FROM carriers
        LEFT JOIN carrier_totals USING (carrier)
    ) carrier_totals;

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
            ORDER BY vt.created_at DESC
        ),
        '[]'::jsonb
    )
    INTO v_recent_transactions
    FROM (
        SELECT *
        FROM public.vtu_transactions
        ORDER BY created_at DESC
        LIMIT 8
    ) vt
    LEFT JOIN public.profiles profile ON profile.id = vt.user_id;

    IF v_days = 1 THEN
        SELECT coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'label', to_char(bucket, 'HH24:MI'),
                    'sales', coalesce(sales.amount_kobo, 0) / 100.0,
                    'deposits', coalesce(deposits.amount_kobo, 0) / 100.0
                )
                ORDER BY bucket
            ),
            '[]'::jsonb
        )
        INTO v_trend
        FROM generate_series(
            date_trunc('day', now()),
            date_trunc('hour', now()),
            interval '1 hour'
        ) AS buckets(bucket)
        LEFT JOIN (
            SELECT date_trunc('hour', created_at) AS bucket, sum(amount_kobo) AS amount_kobo
            FROM public.vtu_transactions
            WHERE status = 'success'
              AND created_at >= date_trunc('day', now())
            GROUP BY 1
        ) sales USING (bucket)
        LEFT JOIN (
            SELECT date_trunc('hour', created_at) AS bucket, sum(amount_kobo) AS amount_kobo
            FROM public.deposits
            WHERE status = 'success'
              AND created_at >= date_trunc('day', now())
            GROUP BY 1
        ) deposits USING (bucket);
    ELSE
        SELECT coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'label', to_char(bucket::DATE, 'Mon DD'),
                    'sales', coalesce(sales.amount_kobo, 0) / 100.0,
                    'deposits', coalesce(deposits.amount_kobo, 0) / 100.0
                )
                ORDER BY bucket
            ),
            '[]'::jsonb
        )
        INTO v_trend
        FROM generate_series(
            current_date - (v_days - 1),
            current_date,
            interval '1 day'
        ) AS buckets(bucket)
        LEFT JOIN (
            SELECT created_at::DATE AS bucket, sum(amount_kobo) AS amount_kobo
            FROM public.vtu_transactions
            WHERE status = 'success'
              AND created_at >= current_date - (v_days - 1)
            GROUP BY 1
        ) sales ON sales.bucket = buckets.bucket::DATE
        LEFT JOIN (
            SELECT created_at::DATE AS bucket, sum(amount_kobo) AS amount_kobo
            FROM public.deposits
            WHERE status = 'success'
              AND created_at >= current_date - (v_days - 1)
            GROUP BY 1
        ) deposits ON deposits.bucket = buckets.bucket::DATE;
    END IF;

    v_overview := jsonb_build_object(
        'totalVolumeToday', v_sales_today / 100.0,
        'netMarginToday', NULL,
        'activeUsers', v_active_users,
        'totalUsers', v_total_users,
        'newUsersToday', v_new_users_today,
        'vtuProviderBalance', NULL,
        'depositsToday', v_deposits_today / 100.0,
        'inflowsCount', 0,
        'successRate', CASE
            WHEN v_transaction_count > 0 THEN round(v_success_count * 100.0 / v_transaction_count, 1)
            ELSE 0
        END,
        'ordersToday', v_transactions_today,
        'carrierBreakdown', v_carrier_breakdown
    );

    RETURN jsonb_build_object(
        'overview', v_overview,
        'trend', v_trend,
        'transactions', v_recent_transactions
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_overview_snapshot(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_overview_snapshot(INTEGER) TO service_role;
