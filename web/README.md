# AbbaKano Web

The AbbaKano web application is a Next.js customer wallet, VTU purchase portal, and Supabase-backed admin console.

## Features

- Email and Nigerian phone-number authentication
- Wallet balance, funding, transaction history, referrals, and support
- Data, airtime, electricity, and cable-TV purchases
- Transaction PIN authorization
- WebAuthn/passkey login and biometric transaction authorization
- Responsive customer experience for desktop and mobile browsers
- Supabase-authenticated admin portal for users, transactions, deposits, audit logs, VTU plans, provider balances, and settings

## Requirements

- Node.js 18 or newer
- npm
- A Supabase project with the repository migrations applied
- Supabase CLI for deploying Edge Functions

## Local setup

```bash
cd web
npm install
```

Create `web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-or-anon-key>
```

Only public Supabase client values belong in `.env.local`. Never put a service-role key, provider API key, payment secret, or WebAuthn signing secret in browser-exposed variables.

## Development and validation

```bash
npm run dev       # http://localhost:4000
npm run lint
npm run build
npm run start
```

The app uses the Supabase client in `src/lib/supabase.ts`. Customer and admin backend operations are implemented in `supabase/functions`.

## Supabase deployment

From the `web` directory, deploy the functions required by the feature being changed:

```bash
npx supabase functions deploy register-user
npx supabase functions deploy verify-transaction-pin
npx supabase functions deploy update-transaction-pin
npx supabase functions deploy data-services
npx supabase functions deploy data-purchase
npx supabase functions deploy purchase-airtime
npx supabase functions deploy electricity-services
npx supabase functions deploy electricity-purchase
npx supabase functions deploy cable-services
npx supabase functions deploy cable-purchase
```

Admin functions include:

```bash
npx supabase functions deploy admin-overview
npx supabase functions deploy admin-transactions
npx supabase functions deploy admin-users
npx supabase functions deploy admin-deposits
npx supabase functions deploy admin-audit-logs
npx supabase functions deploy admin-provider-balances
npx supabase functions deploy admin-vtu-services
npx supabase functions deploy admin-vtu-plans
```

Apply migrations before using the related functions:

```bash
npx supabase db push
```

Required server-side secrets vary by function. Provider and payment credentials must be configured as Supabase Edge Function secrets, not committed to Git. Provider funding-account details are returned by `admin-provider-balances` only when both the account number and account name secrets are configured.

## Admin access

Create an administrator in Supabase Authentication, then set trusted app metadata:

```json
{ "admin_role": "super_admin" }
```

Open `/admin/login`. The admin portal rejects accounts without the `super_admin` app-metadata role. Do not store this role in editable user metadata.

## Authentication and passkeys

- Browser sessions are managed by Supabase Auth.
- Passkey registration and login require HTTPS and a supported authenticator.
- Production WebAuthn origin and relying-party ID must match the deployed domain.
- Transaction PIN hashes and salts remain server-side in `profiles`.
- The browser must never receive PIN hashes, salts, service-role keys, or provider credentials.

## Deployment

The web app can be deployed to Vercel using the `web` directory as the project root. Configure the public Supabase variables in the Vercel project settings and deploy the same Git branch used for production.
