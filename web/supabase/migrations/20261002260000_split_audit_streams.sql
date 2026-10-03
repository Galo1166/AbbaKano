CREATE OR REPLACE FUNCTION public.get_admin_audit_logs(
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 30,
    p_action TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_stream TEXT DEFAULT 'user'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_page INTEGER := greatest(coalesce(p_page, 1), 1);
    v_page_size INTEGER := least(greatest(coalesce(p_page_size, 30), 1), 100);
    v_action TEXT := nullif(trim(p_action), '');
    v_search TEXT := nullif(trim(p_search), '');
    v_stream TEXT := CASE WHEN lower(coalesce(p_stream, 'user')) = 'admin' THEN 'admin' ELSE 'user' END;
    v_logs JSONB;
    v_total BIGINT;
    v_deposit_events BIGINT;
    v_vtu_events BIGINT;
BEGIN
    SELECT
        count(*) FILTER (
            WHERE (v_stream = 'user' AND (action LIKE 'deposit.%' OR action LIKE 'vtu.%'))
               OR (v_stream = 'admin' AND (action LIKE 'admin.%' OR action LIKE 'agent.%'))
        ),
        count(*) FILTER (WHERE v_stream = 'user' AND action LIKE 'deposit.%'),
        count(*) FILTER (WHERE v_stream = 'user' AND action LIKE 'vtu.%')
    INTO v_total, v_deposit_events, v_vtu_events
    FROM public.admin_audit_logs;

    WITH matching_logs AS (
        SELECT
            log.id,
            log.actor_role,
            log.action,
            log.details,
            log.ip_address,
            log.created_at,
            coalesce(
                nullif(trim(profile.full_name), ''),
                nullif(trim(profile.phone), ''),
                auth_user.email,
                'System'
            ) AS actor
        FROM public.admin_audit_logs log
        LEFT JOIN public.profiles profile ON profile.id = log.actor_user_id
        LEFT JOIN auth.users auth_user ON auth_user.id = log.actor_user_id
        WHERE (
                (v_stream = 'user' AND (log.action LIKE 'deposit.%' OR log.action LIKE 'vtu.%'))
             OR (v_stream = 'admin' AND (log.action LIKE 'admin.%' OR log.action LIKE 'agent.%'))
        )
          AND (v_action IS NULL OR log.action = v_action)
          AND (
              v_search IS NULL
              OR position(lower(v_search) IN lower(concat_ws(
                  ' ',
                  log.action,
                  log.details::TEXT,
                  profile.full_name,
                  profile.phone,
                  auth_user.email,
                  log.ip_address::TEXT
              ))) > 0
          )
    ),
    filtered_count AS (
        SELECT count(*) AS total FROM matching_logs
    ),
    paginated_logs AS (
        SELECT *
        FROM matching_logs
        ORDER BY created_at DESC, id DESC
        LIMIT v_page_size
        OFFSET (v_page - 1) * v_page_size
    )
    SELECT
        filtered_count.total,
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'id', paginated_logs.id::TEXT,
                    'actor', paginated_logs.actor,
                    'role', paginated_logs.actor_role,
                    'action', paginated_logs.action,
                    'details', paginated_logs.details,
                    'ip_address', paginated_logs.ip_address::TEXT,
                    'created_at', paginated_logs.created_at
                )
                ORDER BY paginated_logs.created_at DESC, paginated_logs.id DESC
            ) FILTER (WHERE paginated_logs.id IS NOT NULL),
            '[]'::jsonb
        )
    INTO v_total, v_logs
    FROM filtered_count
    LEFT JOIN paginated_logs ON true
    GROUP BY filtered_count.total;

    RETURN jsonb_build_object(
        'auditLogs', v_logs,
        'total', v_total,
        'page', v_page,
        'pageSize', v_page_size,
        'metrics', jsonb_build_object(
            'totalEvents', v_total,
            'depositEvents', v_deposit_events,
            'vtuEvents', v_vtu_events
        )
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_audit_logs(INTEGER, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_audit_logs(INTEGER, INTEGER, TEXT, TEXT, TEXT) TO service_role;
