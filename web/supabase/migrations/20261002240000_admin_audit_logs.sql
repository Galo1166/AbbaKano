CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_role TEXT NOT NULL DEFAULT 'SYSTEM',
    action TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx
    ON public.admin_audit_logs(created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS admin_audit_logs_action_created_at_idx
    ON public.admin_audit_logs(action, created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_audit_logs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.admin_audit_logs FROM service_role;
GRANT SELECT, INSERT ON TABLE public.admin_audit_logs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.admin_audit_logs_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.audit_deposit_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.admin_audit_logs (actor_role, action, details)
    VALUES (
        'SYSTEM',
        CASE WHEN lower(NEW.status) = 'success' THEN 'deposit.settled' ELSE 'deposit.status_changed' END,
        jsonb_build_object(
            'entityType', 'deposit',
            'depositId', NEW.id::TEXT,
            'reference', NEW.reference,
            'userId', NEW.user_id::TEXT,
            'amount', NEW.amount_kobo / 100.0,
            'status', lower(NEW.status),
            'previousStatus', CASE WHEN TG_OP = 'UPDATE' THEN lower(OLD.status) ELSE NULL END
        )
    );
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_vtu_transaction_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.admin_audit_logs (actor_role, action, details)
    VALUES (
        'SYSTEM',
        CASE WHEN lower(NEW.status) = 'success' THEN 'vtu.settled' ELSE 'vtu.status_changed' END,
        jsonb_build_object(
            'entityType', 'vtu_transaction',
            'transactionId', NEW.id::TEXT,
            'reference', coalesce(NEW.provider_reference, NEW.id::TEXT),
            'userId', NEW.user_id::TEXT,
            'transactionType', NEW.transaction_type,
            'amount', NEW.amount_kobo / 100.0,
            'status', lower(NEW.status),
            'previousStatus', CASE WHEN TG_OP = 'UPDATE' THEN lower(OLD.status) ELSE NULL END
        )
    );
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS audit_deposit_status_change_trigger ON public.deposits;
CREATE TRIGGER audit_deposit_status_change_trigger
AFTER INSERT OR UPDATE ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.audit_deposit_status_change();

DROP TRIGGER IF EXISTS audit_vtu_transaction_status_change_trigger ON public.vtu_transactions;
CREATE TRIGGER audit_vtu_transaction_status_change_trigger
AFTER INSERT OR UPDATE ON public.vtu_transactions
FOR EACH ROW
EXECUTE FUNCTION public.audit_vtu_transaction_status_change();

CREATE OR REPLACE FUNCTION public.get_admin_audit_logs(
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 30,
    p_action TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL
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
    v_logs JSONB;
    v_total BIGINT;
    v_deposit_events BIGINT;
    v_vtu_events BIGINT;
BEGIN
    SELECT
        count(*),
        count(*) FILTER (WHERE action LIKE 'deposit.%'),
        count(*) FILTER (WHERE action LIKE 'vtu.%')
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
        WHERE (v_action IS NULL OR log.action = v_action)
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
            'totalEvents', (SELECT count(*) FROM public.admin_audit_logs),
            'depositEvents', v_deposit_events,
            'vtuEvents', v_vtu_events
        )
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_audit_logs(INTEGER, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_audit_logs(INTEGER, INTEGER, TEXT, TEXT) TO service_role;
