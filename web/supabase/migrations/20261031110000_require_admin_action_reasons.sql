CREATE OR REPLACE FUNCTION public.audit_deposit_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_actor_user_id UUID;
    v_reason TEXT;
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    v_actor_user_id := nullif(current_setting('app.admin_actor_user_id', true), '')::UUID;
    v_reason := nullif(current_setting('app.admin_action_reason', true), '');

    INSERT INTO public.admin_audit_logs (actor_user_id, actor_role, action, details)
    VALUES (
        v_actor_user_id,
        CASE WHEN v_actor_user_id IS NULL THEN 'SYSTEM' ELSE 'SUPER_ADMIN' END,
        CASE WHEN lower(NEW.status) = 'success' THEN 'deposit.settled' ELSE 'deposit.status_changed' END,
        jsonb_build_object(
            'entityType', 'deposit',
            'depositId', NEW.id::TEXT,
            'reference', NEW.reference,
            'userId', NEW.user_id::TEXT,
            'amount', NEW.amount_kobo / 100.0,
            'status', lower(NEW.status),
            'previousStatus', CASE WHEN TG_OP = 'UPDATE' THEN lower(OLD.status) ELSE NULL END
        ) || CASE WHEN v_reason IS NULL THEN '{}'::JSONB ELSE jsonb_build_object('reason', v_reason) END
    );
    RETURN NEW;
END;
$function$;

DROP FUNCTION IF EXISTS public.admin_fail_pending_deposit(BIGINT, UUID);

CREATE FUNCTION public.admin_fail_pending_deposit(
    p_deposit_id BIGINT,
    p_actor_user_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_status TEXT;
    v_reason TEXT := trim(coalesce(p_reason, ''));
BEGIN
    IF p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Admin actor is required.';
    END IF;
    IF length(v_reason) < 5 OR length(v_reason) > 500 THEN
        RAISE EXCEPTION 'Enter a reason of 5 to 500 characters for failing this deposit.';
    END IF;

    PERFORM set_config('app.admin_actor_user_id', p_actor_user_id::TEXT, true);
    PERFORM set_config('app.admin_action_reason', v_reason, true);

    SELECT lower(deposit.status)
    INTO v_status
    FROM public.deposits deposit
    WHERE deposit.id = p_deposit_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Deposit not found.');
    END IF;

    IF v_status <> 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Only pending deposits can be marked as failed.'
        );
    END IF;

    UPDATE public.deposits
    SET status = 'failed'
    WHERE id = p_deposit_id;

    RETURN jsonb_build_object('success', true, 'status', 'failed');
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_fail_pending_deposit(BIGINT, UUID, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_fail_pending_deposit(BIGINT, UUID, TEXT)
    TO service_role;
