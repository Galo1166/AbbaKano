create or replace function public.process_monnify_dva_deposit(
  p_user_id uuid,
  p_amount_kobo bigint,
  p_provider_reference text,
  p_payment_reference text,
  p_bank_name text,
  p_account_number text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_deposit public.deposits%rowtype;
  v_wallet public.wallets%rowtype;
  v_deposit_exists boolean;
  v_lock_reference text;
  v_balance_before bigint;
  v_balance_after bigint;
begin
  if p_amount_kobo is null
     or p_amount_kobo <= 0
     or p_payment_reference is null
     or length(trim(p_payment_reference)) = 0
     or p_provider_reference is null
     or length(trim(p_provider_reference)) = 0 then
    raise exception 'Invalid Monnify deposit details';
  end if;

  if p_payment_reference < p_provider_reference then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(p_payment_reference, 0)
    );
    if p_provider_reference <> p_payment_reference then
      perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(p_provider_reference, 0)
      );
    end if;
  else
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(p_provider_reference, 0)
    );
    if p_provider_reference <> p_payment_reference then
      perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(p_payment_reference, 0)
      );
    end if;
  end if;

  select *
  into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;
  if not found then
    raise exception 'Wallet not found for user %', p_user_id;
  end if;

  select *
  into v_deposit
  from public.deposits
  where reference = p_payment_reference
     or provider_reference = p_provider_reference
  for update;
  v_deposit_exists := found;

  if v_deposit_exists then
    if v_deposit.user_id <> p_user_id then
      raise exception 'Deposit reference belongs to another user';
    end if;
    if v_deposit.status = 'success' then
      return jsonb_build_object(
        'status', 'already_processed',
        'deposit_id', v_deposit.id
      );
    end if;
  end if;

  v_balance_before := v_wallet.balance_kobo;
  v_balance_after := v_balance_before + p_amount_kobo;

  update public.wallets
  set balance_kobo = v_balance_after,
      updated_at = now()
  where id = v_wallet.id;

  if v_deposit_exists then
    update public.deposits
    set status = 'success',
        amount_kobo = p_amount_kobo,
        provider_reference = p_provider_reference,
        metadata = p_metadata,
        updated_at = now()
    where id = v_deposit.id;
  else
    insert into public.deposits (
      user_id,
      amount_kobo,
      status,
      provider,
      reference,
      provider_reference,
      metadata
    )
    values (
      p_user_id,
      p_amount_kobo,
      'success',
      'monnify',
      p_payment_reference,
      p_provider_reference,
      p_metadata
    )
    returning * into v_deposit;
  end if;

  insert into public.wallet_ledger (
    user_id,
    wallet_id,
    transaction_id,
    deposit_id,
    entry_type,
    amount_kobo,
    balance_before_kobo,
    balance_after_kobo,
    description,
    metadata
  )
  values (
    p_user_id,
    v_wallet.id,
    null,
    v_deposit.id,
    'deposit',
    p_amount_kobo,
    v_balance_before,
    v_balance_after,
    format(
      'Wallet funded via %s bank transfer (%s)',
      coalesce(p_bank_name, 'Monnify'),
      coalesce(p_account_number, '')
    ),
    p_metadata
  );

  return jsonb_build_object(
    'status', 'processed',
    'deposit_id', v_deposit.id,
    'amount_kobo', p_amount_kobo,
    'balance_before_kobo', v_balance_before,
    'balance_after_kobo', v_balance_after
  );
end;
$function$;

revoke execute on function public.process_monnify_dva_deposit(
  uuid,
  bigint,
  text,
  text,
  text,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.process_monnify_dva_deposit(
  uuid,
  bigint,
  text,
  text,
  text,
  text,
  jsonb
) to service_role;

alter function public.process_monnify_dva_deposit(
  uuid,
  bigint,
  text,
  text,
  text,
  text,
  jsonb
) set search_path = '';
