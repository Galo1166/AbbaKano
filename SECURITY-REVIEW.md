# Supabase Security Review

## Finding

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟠 HIGH | [web/supabase/migrations/20261016150000_monnify_virtual_accounts.sql](./web/supabase/migrations/20261016150000_monnify_virtual_accounts.sql) | 31-43, 75-83, 96-114 | `process_monnify_dva_deposit` is a `SECURITY DEFINER` function that accepts a caller-supplied user ID, amount, and reference, credits the wallet, and records a successful deposit without verifying a Monnify payment. Its execute privilege is not restricted in the migration, so client roles may be able to invoke it directly and create unbacked wallet credits. | 10/10 |

### Recommended remediation

Revoke execute permission from `PUBLIC`, `anon`, and `authenticated`, then grant it only to `service_role`. Ensure the signed Monnify webhook verifies the payment and its amount before calling this function. Consider adding database-level validation that binds the credited user and amount to a verified payment record.

### Other reviewed controls

- The Paystack webhook verifies its signature and checks the paid amount against the stored deposit.
- The data, cable, and electricity reservation/settlement RPCs explicitly revoke execution from public client roles.

This review identified the issue in the migration source. Confirm deployed function privileges and apply the remediation in the live Supabase database as well as in a migration.
