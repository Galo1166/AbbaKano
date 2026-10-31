# AbbaKano Admin Guide

The AbbaKano admin portal is the operations console for monitoring customer
wallets, deposits, telecom purchases, provider liquidity, support cases, and
application settings. It is available at `/admin` in the web application.

## Access and security

Admin access requires signing in at `/admin/login` with a Supabase account whose
trusted **app metadata** contains:

```json
{ "admin_role": "super_admin" }
```

The portal checks the session and role before showing admin pages. Admin
operations are handled by authenticated Supabase Edge Functions; privileged
service credentials must remain server-side and must never be added to browser
environment variables or source code. Admin page visits and administrator
actions are recorded for auditing.

## Admin sections

| Section | Purpose |
| --- | --- |
| **Overview** | Review daily sales, orders, success rate, net wholesale spread, combined customer wallet balance, new users, and provider information. |
| **Users** | Find reseller accounts, inspect account and wallet information, change account status, and make wallet adjustments. Status changes and wallet adjustments require a reason. |
| **Deposits** | Review bank inflows, including customer, DVA account number, destination bank, reference, amount, and settlement status. Search and filter records; pending deposits can be marked failed with a recorded reason. |
| **Transactions** | Search and filter the transaction ledger to investigate airtime, data, and utility purchase activity and its delivery status. |
| **VTU Services** | Review and manage available service plans, provider-specific data-plan prices and display capacities, and cable-plan price overrides. Provider-specific overrides keep catalogs separate. |
| **Provider Balances** | Check live VTUGATE and ALRAHUZDATA balances, connection status, configured low-balance thresholds, and available funding details. A provider balance can be unavailable if its API check fails or the provider does not return a valid balance. |
| **Support Cases** | Review customer inquiries and disputes, track case status, and record customer-resolution actions such as wallet compensation where available. |
| **Notifications** | Review administrator actions and security or system events surfaced by the console. |
| **Audit Logs** | Search and filter administrator activity, customer deposit and VTU status events, and related system events. Use the event details to investigate who acted and when. |
| **Settings** | Configure pricing margins and application settings. Changes require an explanation and are recorded in the audit history. |

## Operating guidance

1. Use **Overview** and **Provider Balances** to check platform activity and
   provider health before investigating a failed or delayed purchase.
2. Use **Transactions**, **Deposits**, and **Audit Logs** to trace the relevant
   customer, reference, status changes, and administrator actions.
3. Use **Users** or **Support Cases** for customer account and resolution work.
   Enter clear reasons for consequential changes; reasons are required for
   supported account, wallet, and deposit actions.
4. Before changing plan prices or routing-related settings, verify the selected
   provider and service. Provider-specific price overrides apply to their own
   catalog and do not imply that customer purchases are routed through that
   provider.
5. Treat live provider balances and statuses as external API results. An
   unavailable value is not a zero balance; check the provider connection and
   server-side configuration before taking action.

The available actions and data depend on the administrator's access, configured
Supabase functions and secrets, and each provider's API response.
