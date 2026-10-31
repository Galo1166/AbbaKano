CREATE OR REPLACE FUNCTION public.get_admin_total_user_wallet_balance()
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
    SELECT coalesce(sum(wallet.balance_kobo), 0)::NUMERIC / 100
    FROM public.profiles profile
    LEFT JOIN public.wallets wallet ON wallet.user_id = profile.id
    WHERE lower(coalesce(profile.role::TEXT, 'user')) = 'user';
$function$;

REVOKE ALL ON FUNCTION public.get_admin_total_user_wallet_balance()
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_total_user_wallet_balance()
    TO service_role;
