# Backend API

Express API for the AbbaKano web and mobile clients. The API listens on port `3000` by default, stores application data in PostgreSQL, and can use Redis for shared rate limits.

## Requirements

- Node.js 22 or newer
- PostgreSQL with the project schema installed
- Redis is optional for local development and recommended when running multiple backend instances

## Local setup

Run database commands from the repository root. Create the database, then apply the base schema and migration:

```powershell
createdb myapp
psql -d myapp -f database/init.sql
psql -d myapp -f database/migrations/001_transaction_integrity.sql
```

From `backend/`, install dependencies, configure the required secret and database connection, then start the API:

```powershell
npm ci
$env:AUTH_SECRET = "replace-with-a-long-random-secret"
$env:DB_HOST = "localhost"
$env:DB_PORT = "5432"
$env:DB_NAME = "myapp"
$env:DB_USER = "postgres"
$env:DB_PASSWORD = "your-local-postgres-password"
node server.js
```

The API should now answer at `http://localhost:3000/health`. `AUTH_SECRET` is required. The backend reads the individual `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` variables; it does not use `DATABASE_URL` for its PostgreSQL connection.

Run the automated tests with `npm test`. Run `node worker.js` in a second backend terminal to retry and reconcile pending VTU transactions. In production, run the worker as a separate process with the same database and VTU provider configuration as the API.

## Connect the web app

The Next.js app sends requests through its server-side proxy at `/api/auth/*`. The proxy forwards requests to the backend and handles browser session cookies. Set `BACKEND_URL` in the web app environment to the backend origin, without a trailing slash:

```env
BACKEND_URL=http://localhost:3000
```

Start the web app from `web/`:

```powershell
npm ci
npm run dev
```

The web app runs at `http://localhost:4000`. It calls paths such as `/api/auth/login`; the proxy forwards that request to `http://localhost:3000/login`. In production, configure `BACKEND_URL` on the web service to the public HTTPS backend origin.

The web client uses cookie-based sessions. Before a mutation it requests `/api/auth/csrf`, then sends the returned token in `X-CSRF-Token`. The proxy forwards the session cookie and CSRF header and sets `X-Client-Platform: web`.

## Connect the mobile app

The Expo app calls the backend directly. Set `EXPO_PUBLIC_API_URL` in the app's environment to the backend origin, with no trailing slash:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

Then start the app from `app/`:

```powershell
npm ci
npm start
```

Use the address reachable from the device:

- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://localhost:3000`
- Physical device: `http://<computer-lan-ip>:3000`, with the phone and computer on the same network
- Production: the public HTTPS backend origin

The mobile client sends `X-Client-Platform: android` and uses `Authorization: Bearer <authToken>` after login or signup. The API includes `authToken` in authentication responses for non-web clients. Store it securely on device and send it on authenticated requests. The native client does not need a CSRF token.

Set `BACKEND_URL` and `EXPO_PUBLIC_API_URL` explicitly for production and point both to the same backend. The clients currently have different built-in production URL fallbacks, so relying on those defaults can connect them to different hosts.

## Authentication and request conventions

- Authentication tokens are signed JWTs with a two-hour lifetime. The web client receives an HttpOnly `session` cookie; native clients receive a bearer token.
- Send JSON requests with `Content-Type: application/json`.
- For web mutations, first call `GET /csrf`, retain the CSRF cookie, and send the returned value as `X-CSRF-Token`. The web proxy and web API helper do this automatically.
- Native requests identify themselves with `X-Client-Platform: android` or `ios` and send the bearer token. This bypasses cookie-based CSRF validation.
- Send an `Idempotency-Key` on VTU purchase requests. Use the same key when retrying the same purchase; reusing it with different request data returns `409`.
- Successful responses are JSON unless the route documents an empty `204` response. Errors generally return JSON with a `message` field. Auth failures return `401`; invalid input returns `400`; CSRF failures return `403`.

Example mobile login request:

```http
POST /login
Content-Type: application/json
X-Client-Platform: android

{"identifier":"08012345678","password":"your-password"}
```

Use the returned `authToken` on later requests:

```http
GET /me
Authorization: Bearer <authToken>
X-Client-Platform: android
```

## API routes

All paths below are relative to the backend origin. Except for health checks, login/signup, callbacks, and webhooks, routes require an authenticated session or bearer token.

| Area | Routes |
| --- | --- |
| Health | `GET /`, `GET /health`, `GET /health/config`, `GET /test-db` |
| Session and accounts | `GET /csrf`, `POST /signup`, `POST /login`, `POST /logout`, `POST /password-reset/request`, `GET /me` |
| Device and passkeys | `/auth/device/*`, `/auth/passkey/*` |
| Profile and wallet | `POST /me/virtual-account`, `PATCH /me/security-settings`, `/me/transaction-pin/*`, `POST /me/app-lock/verify`, `GET /wallet`, `GET /deposits`, `GET /transactions` |
| Referrals and agents | `POST /referrals/commission/withdraw`, `POST /agents/request` |
| Payments | `POST /payments/paystack/initialize`, `GET /payments/paystack/verify/:reference`; Paystack callback and webhook routes are documented below |
| VTU | `GET /vtu/plans`, `GET /vtu/service-plans`, `GET /vtu/account-details`, `POST /vtu/verify-electricity`, `POST /vtu/verify-cable`, `POST /vtu/airtime`, `POST /vtu/data`, `POST /vtu/electricity`, `POST /vtu/cable_tv`, `GET /vtu/transactions` |
| Admin | `/admin/*`; see [ADMIN.md](./ADMIN.md) |

VTU purchase requests require transaction authorization: a four-digit `pin` or a short-lived `transactionAuthorization` obtained through passkey transaction verification. Data, cable TV, and electricity purchases also require a valid `planToken` returned by the plans API. Purchases may return `201` for success, `202` while provider processing continues, or an error status.

Provider callbacks are server-to-server endpoints and must not be called by the clients:

- `GET /payments/paystack/callback`
- `POST /payments/paystack/webhook`
- `POST /vtu/vtpass/webhook`

Configure provider callback URLs to the public backend origin. Paystack webhooks are verified against the raw request body and `PAYSTACK_SECRET_KEY`.

## Environment variables

Set secrets in the hosting provider's secret manager. Do not commit real API keys or production credentials.

| Variable | Required | Purpose |
| --- | --- | --- |
| `AUTH_SECRET` | Yes | Signs session and transaction authorization tokens. Use a long, random value and keep it stable across backend instances. |
| `PORT` | No | HTTP port; defaults to `3000`. |
| `NODE_ENV` | No | Set to `production` in production; enables secure cookies and strict CORS origin matching. |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Yes | PostgreSQL connection settings. Defaults are for local development only. |
| `REDIS_URL` | No | Redis connection for shared rate limiting. |
| `CORS_ORIGINS` | Production | Comma-separated browser origins allowed to call the API directly. Include the exact scheme and host. |
| `SECURE_COOKIES` | No | Set to `true` to force secure cookies; production also enables them automatically. |
| `WEBAUTHN_ORIGIN` | Production | Exact web app origin, such as `https://app.example.com` (no path). Required in production; local default is `http://localhost:4000`. |
| `WEBAUTHN_RP_ID` | No | WebAuthn relying-party hostname. Defaults to the hostname in `WEBAUTHN_ORIGIN`; set a parent domain only when passkeys should be shared across its subdomains. |
| `PAYSTACK_SECRET_KEY` | Payments | Enables Paystack initialization, verification, and webhooks. |
| `PAYSTACK_CALLBACK_URL`, `PAYSTACK_FRONTEND_URL`, `PAYSTACK_APP_CALLBACK_URL` | No | Backend callback and web/mobile return destinations. Defaults target local development. |
| `PAYSTACK_DEDICATED_BANK` | No | Preferred bank for Paystack dedicated account provisioning. |
| `GAFIAPAY_BASE_URL`, `GAFIAPAY_API_KEY`, `GAFIAPAY_SECRET_KEY`, `GAFIAPAY_TIMEOUT_MS` | Virtual accounts | GafiaPay account provisioning configuration. |
| `VTU_PRIMARY_PROVIDER`, `VTU_FALLBACK_PROVIDER` | VTU | Select the primary and optional fallback VTU provider. Configure only providers intended for use. |
| `VTU_PROVIDER_URL`, `VTU_PROVIDER_API_KEY` | Optional VTU | Generic VTU provider endpoint and API key. |
| `VTPASS_BASE_URL`, `VTPASS_API_KEY`, `VTPASS_PUBLIC_KEY`, `VTPASS_SECRET_KEY` | Optional VTU | VTPass credentials and endpoint. |
| `VTPASS_FALLBACK_CODES` | No | Comma-separated VTPass response codes eligible for fallback. |
| `VTU_GATE_BASE_URL`, `VTU_GATE_API_KEY`, `VTU_GATE_TIMEOUT_MS` | Optional VTU | VTU Gate endpoint, key, and request timeout. |
| `VTU_PROVIDER_TIMEOUT_MS`, `VTU_PLAN_CACHE_TTL_MS`, `VTU_PLAN_TOKEN_SECRET` | No | Provider timeout, plan cache lifetime, and plan-token signing secret. The plan-token secret defaults to `AUTH_SECRET`. |
| `VTU_RATE_LIMIT`, `VERIFIED_AGENT_RATE_LIMIT`, `VTU_RATE_WINDOW_SECONDS` | No | VTU request rate limits and time window. |
| `VTU_DAILY_LIMIT_NAIRA`, `VTU_PHONE_DAILY_LIMIT` | No | Default daily spend and per-phone purchase controls. Verified agent limits can be stored in the database. |
| `VTU_GATE_PAYVESSEL_ACCOUNT`, `VTU_GATE_PAYVESSEL_ACCOUNT_NAME`, `VTU_GATE_PAYMENTPOINT_ACCOUNT`, `VTU_GATE_PAYMENTPOINT_ACCOUNT_NAME` | No | Override VTU Gate funding details shown in the admin provider-balance response. |
| `VTU_GATE_LOW_BALANCE_THRESHOLD_NAIRA` | No | Admin low-balance threshold; defaults to `500000` naira. |

For VTU provider selection and VTU Gate-only setup, see [ADMIN.md](./ADMIN.md). The runtime configuration endpoint `GET /health/config` reports whether key services are configured without returning secret values.

## Production checklist

- Serve the API and web app over HTTPS and set `NODE_ENV=production`.
- Set the same canonical API origin in web `BACKEND_URL` and mobile `EXPO_PUBLIC_API_URL`.
- Restrict `CORS_ORIGINS` to the actual browser origins when clients call the backend directly.
- Set `WEBAUTHN_ORIGIN` to the web app's public HTTPS origin, not the backend API origin. Set `WEBAUTHN_RP_ID` to that hostname or an eligible parent domain.
- Configure PostgreSQL, Redis if using multiple API instances, and all required payment/VTU provider credentials.
- Run `node worker.js` as a separate service for retrying pending VTU transactions.
- Point Paystack callback and webhook URLs at the deployed backend and configure the provider dashboard accordingly.
