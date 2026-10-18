CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE OR REPLACE FUNCTION public.fail_expired_pending_deposits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_failed_count INTEGER;
BEGIN
    UPDATE public.deposits
    SET status = 'failed'
    WHERE lower(status) = 'pending'
      AND created_at <= now() - interval '1 hour';

    GET DIAGNOSTICS v_failed_count = ROW_COUNT;
    RETURN v_failed_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.fail_expired_pending_deposits() FROM PUBLIC, anon, authenticated;

DO $schedule$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM cron.job
        WHERE jobname = 'fail-expired-pending-deposits'
    ) THEN
        PERFORM cron.schedule(
            'fail-expired-pending-deposits',
            '* * * * *',
            'SELECT public.fail_expired_pending_deposits();'
        );
    END IF;
END;
$schedule$;
