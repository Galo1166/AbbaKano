create or replace function public.create_airtime_reservation(
  p_user_id uuid,
  p_network text,
  p_phone_number text,
  p_amount_kobo bigint,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_wallet public.wallets%rowtype;
  v_transaction public.vtu_transactions%rowtype;
  v_reservation public.wallet_reservations%rowtype;
  v_held_kobo bigint;
  v_available_kobo bigint;
begin
  if p_network is null
     or p_phone_number is null
     or p_amount_kobo is null
     or upper(p_network) not in ('MTN', 'AIRTEL', 'GLO', '9MOBILE')
     or p_phone_number !~ '^0[0-9]{10}$'
     or p_amount_kobo < 5000
     or p_amount_kobo > 10000000 then
    raise exception 'Invalid airtime purchase';
  end if;
  if p_idempotency_key is null
     or length(trim(p_idempotency_key)) = 0
     or length(p_idempotency_key) > 200 then
    raise exception 'Valid idempotency key is required';
  end if;

  select *
  into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;
  if not found then
    raise exception 'Wallet not found';
  end if;

  select *
  into v_transaction
  from public.vtu_transactions
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key
  for update;
  if found then
    if v_transaction.transaction_type <> 'airtime' then
      raise exception 'Idempotency key belongs to another transaction type';
    end if;
    select *
    into v_reservation
    from public.wallet_reservations
    where transaction_id = v_transaction.id;
    return jsonb_build_object(
      'status', 'already_exists',
      'transaction_id', v_transaction.id,
      'transaction_status', v_transaction.status,
      'reservation_status', v_reservation.status,
      'provider_reference', v_transaction.provider_reference
    );
  end if;

  select coalesce(sum(amount_kobo), 0)
  into v_held_kobo
  from public.wallet_reservations
  where wallet_id = v_wallet.id
    and status = 'held';
  v_available_kobo := v_wallet.balance_kobo - v_held_kobo;
  if v_available_kobo < p_amount_kobo then
    raise exception 'Insufficient wallet balance';
  end if;

  insert into public.vtu_transactions (
    user_id,
    transaction_type,
    network,
    service_provider,
    phone_number,
    amount_kobo,
    status,
    provider,
    attempt_count,
    idempotency_key,
    metadata
  )
  values (
    p_user_id,
    'airtime',
    upper(p_network),
    'vtugate',
    p_phone_number,
    p_amount_kobo,
    'processing',
    'vtugate',
    1,
    p_idempotency_key,
    jsonb_build_object('source', 'web')
  )
  returning * into v_transaction;

  insert into public.wallet_reservations (
    user_id,
    wallet_id,
    transaction_id,
    amount_kobo,
    status
  )
  values (
    p_user_id,
    v_wallet.id,
    v_transaction.id,
    p_amount_kobo,
    'held'
  )
  returning * into v_reservation;

  return jsonb_build_object(
    'status', 'created',
    'transaction_id', v_transaction.id,
    'reservation_id', v_reservation.id,
    'amount_kobo', p_amount_kobo,
    'available_balance_kobo', v_available_kobo
  );
end;
$function$;

create or replace function public.settle_airtime_purchase(
  p_transaction_id bigint,
  p_provider_reference text,
  p_provider_response jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_transaction public.vtu_transactions%rowtype;
  v_reservation public.wallet_reservations%rowtype;
  v_wallet public.wallets%rowtype;
  v_balance_before bigint;
  v_balance_after bigint;
begin
  select *
  into v_transaction
  from public.vtu_transactions
  where id = p_transaction_id
  for update;
  if not found or v_transaction.transaction_type <> 'airtime' then
    raise exception 'Airtime transaction not found';
  end if;

  select *
  into v_reservation
  from public.wallet_reservations
  where transaction_id = p_transaction_id
  for update;
  if not found then
    raise exception 'Wallet reservation not found';
  end if;

  if v_reservation.status = 'settled' then
    select *
    into v_wallet
    from public.wallets
    where id = v_reservation.wallet_id;
    return jsonb_build_object(
      'status', 'already_settled',
      'transaction_id', p_transaction_id,
      'balance_after_kobo', v_wallet.balance_kobo
    );
  end if;
  if v_reservation.status <> 'held'
     or v_transaction.status <> 'processing' then
    raise exception 'Airtime purchase is not awaiting settlement';
  end if;
  if p_provider_reference is null
     or length(trim(p_provider_reference)) = 0
     or p_provider_response is null then
    raise exception 'Provider acceptance details are required';
  end if;

  select *
  into v_wallet
  from public.wallets
  where id = v_reservation.wallet_id
  for update;
  if not found or v_wallet.balance_kobo < v_reservation.amount_kobo then
    raise exception 'Insufficient wallet balance during settlement';
  end if;

  v_balance_before := v_wallet.balance_kobo;
  v_balance_after := v_balance_before - v_reservation.amount_kobo;

  update public.wallets
  set balance_kobo = v_balance_after,
      updated_at = now()
  where id = v_wallet.id;

  insert into public.wallet_ledger (
    user_id,
    wallet_id,
    transaction_id,
    entry_type,
    amount_kobo,
    balance_before_kobo,
    balance_after_kobo,
    description,
    metadata
  )
  values (
    v_transaction.user_id,
    v_wallet.id,
    p_transaction_id,
    'purchase',
    -v_reservation.amount_kobo,
    v_balance_before,
    v_balance_after,
    'Airtime purchase',
    jsonb_build_object(
      'network', v_transaction.network,
      'phone_number', v_transaction.phone_number,
      'provider', v_transaction.provider,
      'provider_reference', p_provider_reference
    )
  );

  update public.wallet_reservations
  set status = 'settled',
      updated_at = now()
  where id = v_reservation.id;

  update public.vtu_transactions
  set status = 'success',
      provider_reference = p_provider_reference,
      provider_response = p_provider_response,
      updated_at = now()
  where id = p_transaction_id;

  return jsonb_build_object(
    'status', 'settled',
    'transaction_id', p_transaction_id,
    'balance_before_kobo', v_balance_before,
    'balance_after_kobo', v_balance_after
  );
end;
$function$;

create or replace function public.release_airtime_reservation(
  p_transaction_id bigint,
  p_provider_response jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_transaction public.vtu_transactions%rowtype;
  v_reservation public.wallet_reservations%rowtype;
begin
  select *
  into v_transaction
  from public.vtu_transactions
  where id = p_transaction_id
  for update;
  if not found or v_transaction.transaction_type <> 'airtime' then
    raise exception 'Airtime transaction not found';
  end if;

  select *
  into v_reservation
  from public.wallet_reservations
  where transaction_id = p_transaction_id
  for update;
  if not found then
    raise exception 'Wallet reservation not found';
  end if;

  if v_reservation.status = 'released'
     and v_transaction.status = 'failed' then
    return;
  end if;
  if v_reservation.status <> 'held'
     or v_transaction.status <> 'processing' then
    raise exception 'Airtime reservation cannot be released';
  end if;

  update public.wallet_reservations
  set status = 'released',
      updated_at = now()
  where id = v_reservation.id;
  update public.vtu_transactions
  set status = 'failed',
      provider_response = p_provider_response,
      updated_at = now()
  where id = p_transaction_id;
end;
$function$;

do $block$
declare
  v_signature text;
begin
  for v_signature in
    select p.oid::regprocedure::text
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'create_airtime_reservation',
        'settle_airtime_purchase',
        'release_airtime_reservation'
      )
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated',
      v_signature
    );
  end loop;
end;
$block$;

grant execute on function public.create_airtime_reservation(
  uuid, text, text, bigint, text
) to service_role;
grant execute on function public.settle_airtime_purchase(
  bigint, text, jsonb
) to service_role;
grant execute on function public.release_airtime_reservation(
  bigint, jsonb
) to service_role;
