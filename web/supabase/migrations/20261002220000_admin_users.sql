CREATE OR REPLACE FUNCTION public.get_admin_users(
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 15,
    p_search TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_page INTEGER := greatest(coalesce(p_page, 1), 1);
    v_page_size INTEGER := least(greatest(coalesce(p_page_size, 15), 1), 100);
    v_search TEXT := nullif(trim(p_search), '');
    v_status TEXT := nullif(lower(trim(p_status)), '');
    v_users JSONB;
    v_total BIGINT;
    v_active BIGINT;
    v_blocked BIGINT;
BEGIN
    IF v_status IS NOT NULL AND v_status NOT IN ('active', 'blocked') THEN
        RAISE EXCEPTION 'Unsupported account status filter.';
    END IF;

    SELECT
        count(*),
        count(*) FILTER (WHERE lower(coalesce(profile.status::TEXT, 'active')) = 'active'),
        count(*) FILTER (WHERE lower(coalesce(profile.status::TEXT, 'active')) = 'blocked')
    INTO v_total, v_active, v_blocked
    FROM public.profiles profile
    WHERE lower(coalesce(profile.role::TEXT, 'user')) = 'user';

    WITH transaction_totals AS (
        SELECT
            user_id,
            count(*) AS total_transactions,
            coalesce(sum(amount_kobo) FILTER (WHERE lower(status) = 'success'), 0) AS total_spent_kobo,
            max(created_at) AS last_transaction_at
        FROM public.vtu_transactions
        GROUP BY user_id
    ),
    matching_users AS (
        SELECT
            profile.id,
            coalesce(nullif(trim(profile.full_name), ''), nullif(trim(profile.phone), ''), 'Customer') AS full_name,
            coalesce(auth_user.email, '') AS email,
            coalesce(profile.phone, '') AS phone,
            lower(coalesce(profile.status::TEXT, 'active')) AS status,
            profile.created_at,
            coalesce(wallet.balance_kobo, 0) AS balance_kobo,
            coalesce(transaction_totals.total_transactions, 0) AS total_transactions,
            coalesce(transaction_totals.total_spent_kobo, 0) AS total_spent_kobo,
            coalesce(transaction_totals.last_transaction_at, profile.created_at) AS last_transaction_at
        FROM public.profiles profile
        LEFT JOIN auth.users auth_user ON auth_user.id = profile.id
        LEFT JOIN public.wallets wallet ON wallet.user_id = profile.id
        LEFT JOIN transaction_totals ON transaction_totals.user_id = profile.id
        WHERE lower(coalesce(profile.role::TEXT, 'user')) = 'user'
          AND (
              v_status IS NULL
              OR lower(coalesce(profile.status::TEXT, 'active')) = v_status
          )
          AND (
              v_search IS NULL
              OR position(lower(v_search) IN lower(concat_ws(
                  ' ',
                  profile.id::TEXT,
                  profile.full_name,
                  profile.phone,
                  auth_user.email
              ))) > 0
          )
    ),
    filtered_count AS (
        SELECT count(*) AS total FROM matching_users
    ),
    paginated_users AS (
        SELECT *
        FROM matching_users
        ORDER BY created_at DESC, id DESC
        LIMIT v_page_size
        OFFSET (v_page - 1) * v_page_size
    )
    SELECT
        filtered_count.total,
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'id', paginated_users.id::TEXT,
                    'name', paginated_users.full_name,
                    'email', paginated_users.email,
                    'phone', paginated_users.phone,
                    'status', paginated_users.status,
                    'created_at', paginated_users.created_at,
                    'wallet_balance', paginated_users.balance_kobo / 100.0,
                    'total_transactions', paginated_users.total_transactions,
                    'total_spent', paginated_users.total_spent_kobo / 100.0,
                    'last_transaction_at', paginated_users.last_transaction_at
                )
                ORDER BY paginated_users.created_at DESC, paginated_users.id DESC
            ) FILTER (WHERE paginated_users.id IS NOT NULL),
            '[]'::jsonb
        )
    INTO v_total, v_users
    FROM filtered_count
    LEFT JOIN paginated_users ON true
    GROUP BY filtered_count.total;

    RETURN jsonb_build_object(
        'users', v_users,
        'total', v_total,
        'metrics', jsonb_build_object(
            'active', v_active,
            'blocked', v_blocked
        )
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_users(INTEGER, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_users(INTEGER, INTEGER, TEXT, TEXT) TO service_role;
