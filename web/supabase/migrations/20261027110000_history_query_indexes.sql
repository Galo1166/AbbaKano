-- Covers the history screen's user-scoped reverse-chronological queries.
create index if not exists deposits_user_created_at_idx
  on public.deposits (user_id, created_at desc);

create index if not exists wallet_ledger_user_created_at_idx
  on public.wallet_ledger (user_id, created_at desc);

create index if not exists vtu_transactions_user_created_at_idx
  on public.vtu_transactions (user_id, created_at desc);
