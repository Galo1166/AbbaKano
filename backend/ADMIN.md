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