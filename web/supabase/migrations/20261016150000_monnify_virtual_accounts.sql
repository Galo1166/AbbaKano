-- Table for user dedicated virtual bank accounts (Monnify / DVA)
create table if not exists public.user_virtual_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_reference text not null,
  account_name text not null,
  bank_name text not null,
  bank_code text,
  account_number text not null,
  provider text not null default 'monnify',
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, bank_name, account_number)
);

create index if not exists user_virtual_accounts_user_id_idx on public.user_virtual_accounts(user_id);
create index if not exists user_virtual_accounts_account_number_idx on public.user_virtual_accounts(account_number);
create index if not exists user_virtual_accounts_reference_idx on public.user_virtual_accounts(account_reference);

-- Enable RLS
alter table public.user_virtual_accounts enable row level security;

-- Users can read their own virtual accounts
create policy "Users can read own virtual accounts"
  on public.user_virtual_accounts
  for select
  using (auth.uid() = user_id);

-- Atomic deposit processing function for Monnify DVA automated bank transfers
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
as $$
declare
  v_deposit public.deposits%rowtype;
  v_wallet public.wallets%rowtype;
  v_balance_before bigint;
  v_balance_after bigint;
begin
  -- Idempotency check: see if this transaction was already credited
  select *
  into v_deposit
  from public.deposits
  where reference = p_payment_reference or provider_reference = p_provider_reference
  for update;

  if found and v_deposit.status = 'success' then
    return jsonb_build_object(
      'status', 'already_processed',
      'deposit_id', v_deposit.id
    );
  end if;

  -- Lock user's wallet
  select *
  into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Wallet not found for user %', p_user_id;
  end if;

  v_balance_before := v_wallet.balance_kobo;
  v_balance_after := v_balance_before + p_amount_kobo;

  -- Credit wallet
  update public.wallets
  set
    balance_kobo = v_balance_after,
    updated_at = now()
  where id = v_wallet.id;

  -- Insert or update deposit record
  if found then
    update public.deposits
    set
      status = 'success',
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

  -- Insert wallet ledger entry
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
    format('Wallet funded via %s bank transfer (%s)', coalesce(p_bank_name, 'Monnify'), coalesce(p_account_number, '')),
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
$$;
