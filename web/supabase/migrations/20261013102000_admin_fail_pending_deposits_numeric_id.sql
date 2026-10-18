DROP FUNCTION IF EXISTS public.admin_fail_pending_deposit(UUID, UUID);

CREATE OR REPLACE FUNCTION public.admin_fail_pending_deposit(
    p_deposit_id BIGINT,
    p_actor_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_status TEXT;
BEGIN
    IF p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Admin actor is required.';
    END IF;

    PERFORM set_config('app.admin_actor_user_id', p_actor_user_id::TEXT, true);

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

REVOKE ALL ON FUNCTION public.admin_fail_pending_deposit(BIGINT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_fail_pending_deposit(BIGINT, UUID) TO service_role;
