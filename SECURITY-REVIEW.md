# Supabase Security Review

## Findings and remediation status

| # | Severity | File | Lines | Finding | Confidence | Status |
|---|----------|------|-------|---------|------------|--------|
| 1 | 🟠 HIGH | [web/supabase/migrations/20261016150000_monnify_virtual_accounts.sql](./web/supabase/migrations/20261016150000_monnify_virtual_accounts.sql) | 31-43, 75-83, 96-114 | The `SECURITY DEFINER` Monnify deposit function originally credited caller-supplied user/amount details without restricting RPC execution, creating a path to unbacked wallet credit. | 10/10 | Migration deployed |
| 2 | 🟡 MEDIUM | [web/supabase/functions/data-purchase/index.ts](./web/supabase/functions/data-purchase/index.ts) | 453-504 | The original settlement-error fallback directly edited wallet/reservation/ledger and clamped balance at zero, bypassing atomic settlement checks and potentially marking an under-debited purchase successful. | 9/10 | Function deployed |
| 3 | 🟡 MEDIUM | [web/supabase/functions/purchase-airtime/index.ts](./web/supabase/functions/purchase-airtime/index.ts) | 459-501 | The original handler marked airtime successful before wallet debit, and the repository lacked auditable authoritative airtime reservation/settlement function definitions. | 8/10 | Migration and function deployed |

## Changes made

- [20261019090500_restrict_monnify_deposit_rpc.sql](./web/supabase/migrations/20261019090500_restrict_monnify_deposit_rpc.sql) replaces the Monnify credit function with a schema-qualified implementation, serializes duplicate references, validates references and amount, restricts execution to `service_role`, and pins its search path.
- [20261019091500_secure_airtime_reservations.sql](./web/supabase/migrations/20261019091500_secure_airtime_reservations.sql) adds atomic airtime reservation, settlement, and release functions. Reservation checks available funds after existing holds; settlement debits the wallet, records the ledger, closes the reservation, and marks the transaction successful in one database transaction. Function execution is restricted to `service_role`.
- The data handler no longer writes wallet, ledger, or reservation records directly when atomic settlement fails; it returns a pending result and leaves the held reservation for reconciliation.
- The airtime handler persists provider acceptance while the transaction is processing and reports success only after atomic settlement succeeds. On settlement failure it returns pending and retains the hold.
- The Monnify webhook validates non-empty references and a finite, positive amount before invoking its deposit function.

The data, cable, and electricity purchase paths also use server-side reservation/settlement functions that check available wallet balance. In this repository, no confirmed normal purchase path was found that succeeds without those balance checks.

## Deployment note

Both migrations were applied to the linked `ABBAKANO` Supabase project on 2026-10-19. The `data-purchase` (version 25), `purchase-airtime` (version 28), and `monnify-webhook` (version 2) Edge Functions report `ACTIVE`. Remote database lint and direct privilege inspection could not be completed because the configured database password failed authentication; recheck RPC grants in the Supabase SQL editor.
