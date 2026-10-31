CREATE INDEX IF NOT EXISTS admin_audit_logs_role_created_at_idx
    ON public.admin_audit_logs(actor_role, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.audit_admin_wallet_adjustment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_actor_user_id UUID;
BEGIN
    IF NEW.entry_type <> 'adjustment'
       OR coalesce(NEW.metadata->>'admin_user_id', '') !~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN NEW;
    END IF;
    v_actor_user_id := (NEW.metadata->>'admin_user_id')::UUID;

    INSERT INTO public.admin_audit_logs (
        actor_user_id, actor_role, action, details
    )
    VALUES (
        v_actor_user_id,
        'SUPER_ADMIN',
        'admin.wallet_adjusted',
        jsonb_build_object(
            'userId', NEW.user_id::TEXT,
            'direction', NEW.metadata->>'direction',
            'amount', abs(NEW.amount_kobo) / 100.0,
            'reason', NEW.description,
            'balanceBefore', NEW.balance_before_kobo / 100.0,
            'balanceAfter', NEW.balance_after_kobo / 100.0,
            'adjustmentId', NEW.metadata->>'adjustment_id'
        )
    );
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS audit_admin_wallet_adjustment_trigger ON public.wallet_ledger;
CREATE TRIGGER audit_admin_wallet_adjustment_trigger
AFTER INSERT ON public.wallet_ledger
FOR EACH ROW
WHEN (NEW.entry_type = 'adjustment')
EXECUTE FUNCTION public.audit_admin_wallet_adjustment();

DROP FUNCTION IF EXISTS public.get_admin_audit_logs(INTEGER, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_admin_audit_logs(INTEGER, INTEGER, TEXT, TEXT, TEXT);

CREATE FUNCTION public.get_admin_audit_logs(
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 30,
    p_action TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_stream TEXT DEFAULT 'all',
    p_from DATE DEFAULT NULL,
    p_to DATE DEFAULT NULL,
    p_actor_role TEXT DEFAULT NULL
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
    v_actor_role TEXT := nullif(upper(trim(p_actor_role)), '');
    v_stream TEXT := lower(coalesce(p_stream, 'all'));
    v_logs JSONB;
    v_stream_total BIGINT;
    v_filtered_total BIGINT;
    v_deposit_events BIGINT;
    v_vtu_events BIGINT;
    v_admin_events BIGINT;
    v_actions JSONB;
    v_roles JSONB;
BEGIN
    IF v_stream NOT IN ('all', 'admin', 'user') THEN
        RAISE EXCEPTION 'Invalid audit stream.';
    END IF;
    IF p_from IS NOT NULL AND p_to IS NOT NULL AND p_from > p_to THEN
        RAISE EXCEPTION 'The start date must be on or before the end date.';
    END IF;

    SELECT
        count(*) FILTER (
            WHERE v_stream = 'all'
               OR (v_stream = 'user' AND (action LIKE 'deposit.%' OR action LIKE 'vtu.%'))
               OR (v_stream = 'admin' AND (actor_role <> 'SYSTEM' OR action LIKE 'admin.%' OR action LIKE 'agent.%'))
        ),
        count(*) FILTER (
            WHERE action LIKE 'deposit.%'
              AND v_stream IN ('all', 'user')
        ),
        count(*) FILTER (
            WHERE action LIKE 'vtu.%'
              AND v_stream IN ('all', 'user')
        ),
        count(*) FILTER (
            WHERE (actor_role <> 'SYSTEM' OR action LIKE 'admin.%' OR action LIKE 'agent.%')
              AND v_stream IN ('all', 'admin')
        ),
        coalesce(
            jsonb_agg(DISTINCT action ORDER BY action) FILTER (
                WHERE v_stream = 'all'
                   OR (v_stream = 'user' AND (action LIKE 'deposit.%' OR action LIKE 'vtu.%'))
                   OR (v_stream = 'admin' AND (actor_role <> 'SYSTEM' OR action LIKE 'admin.%' OR action LIKE 'agent.%'))
            ),
            '[]'::jsonb
        ),
        coalesce(
            jsonb_agg(DISTINCT actor_role ORDER BY actor_role) FILTER (
                WHERE v_stream = 'all'
                   OR (v_stream = 'user' AND (action LIKE 'deposit.%' OR action LIKE 'vtu.%'))
                   OR (v_stream = 'admin' AND (actor_role <> 'SYSTEM' OR action LIKE 'admin.%' OR action LIKE 'agent.%'))
            ),
            '[]'::jsonb
        )
    INTO v_stream_total, v_deposit_events, v_vtu_events, v_admin_events, v_actions, v_roles
    FROM public.admin_audit_logs;

    WITH matching_logs AS (
        SELECT
            log.id,
            log.actor_user_id,
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
                v_stream = 'all'
             OR (v_stream = 'user' AND (log.action LIKE 'deposit.%' OR log.action LIKE 'vtu.%'))
             OR (v_stream = 'admin' AND (log.actor_role <> 'SYSTEM' OR log.action LIKE 'admin.%' OR log.action LIKE 'agent.%'))
        )
          AND (v_action IS NULL OR log.action = v_action)
          AND (v_actor_role IS NULL OR upper(log.actor_role) = v_actor_role)
          AND (p_from IS NULL OR log.created_at >= (p_from::TIMESTAMP AT TIME ZONE 'UTC'))
          AND (p_to IS NULL OR log.created_at < ((p_to + 1)::TIMESTAMP AT TIME ZONE 'UTC'))
          AND (
              v_search IS NULL
              OR position(lower(v_search) IN lower(concat_ws(
                  ' ',
                  log.action,
                  log.details::TEXT,
                  log.actor_user_id::TEXT,
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
                    'actor_user_id', paginated_logs.actor_user_id::TEXT,
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
    INTO v_filtered_total, v_logs
    FROM filtered_count
    LEFT JOIN paginated_logs ON true
    GROUP BY filtered_count.total;

    RETURN jsonb_build_object(
        'auditLogs', v_logs,
        'total', v_filtered_total,
        'page', v_page,
        'pageSize', v_page_size,
        'actions', v_actions,
        'roles', v_roles,
        'metrics', jsonb_build_object(
            'totalEvents', v_stream_total,
            'adminEvents', v_admin_events,
            'depositEvents', v_deposit_events,
            'vtuEvents', v_vtu_events
        )
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_audit_logs(INTEGER, INTEGER, TEXT, TEXT, TEXT, DATE, DATE, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_audit_logs(INTEGER, INTEGER, TEXT, TEXT, TEXT, DATE, DATE, TEXT)
    TO service_role;
