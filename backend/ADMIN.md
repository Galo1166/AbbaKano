# Admin Dashboard

The secured dashboard is served by the backend at `/admin-dashboard/`.

Authentication uses the existing admin user session. The dashboard rejects unauthenticated users with `401` and non-admin users with `403`. Mutating requests use the backend CSRF token and server-side audit logging.

Implemented API groups:

- `/admin/auth/me`, `/admin/auth/logout`
- `/admin/dashboard/summary`, `/admin/dashboard/trend`, `/admin/dashboard/revenue-by-type`, `/admin/dashboard/today`
- `/admin/users`, `/admin/users/:id`, `/admin/users/:id/history`, `/admin/users/:id/status`, `/admin/users/:id/ledger`
- `/admin/transactions`
- `/admin/audit-log`

Open the dashboard through the backend origin, for example `http://localhost:3000/admin-dashboard/`. In production, expose the backend URL or place the dashboard behind the same authenticated reverse proxy as the API.

## Create the first admin

Admin accounts are regular `users` rows with `role = 'admin'` and `admin_role = 'super_admin'`; no separate admin-user migration is needed. The database must already have the admin schema and permissions from `database/migrations/001_transaction_integrity.sql`.

To create an admin on Render, temporarily set `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` on the backend service, deploy, then open its Shell and run `npm run create-admin`. The script lowercases the email, hashes the password with the same scrypt format used by login, checks the migration and permissions, and refuses to overwrite an existing account. Remove both temporary variables and redeploy after it succeeds. Do not put the password in a command, source file, or migration.

## Use VTU Gate only

Set `VTU_PRIMARY_PROVIDER=vtugate` and `VTU_GATE_API_KEY` on the backend service. `VTU_GATE_BASE_URL` is optional and defaults to the VTU Gate API URL. In this mode data, cable TV, and electricity plans, verification, and purchases use VTU Gate only; requests with older VTPass plan tokens are rejected before reserving wallet funds. Remove `VTPASS_*`, `VTU_PROVIDER_*`, and `VTU_FALLBACK_PROVIDER` settings if you do not intend to keep those integrations configured. Redeploy the backend after changing provider settings.