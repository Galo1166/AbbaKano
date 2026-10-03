This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Render backend connection

In the Render dashboard, set `BACKEND_URL` on the web service to `https://abbakano.onrender.com` (the backend service URL, without an endpoint path), then redeploy the web service. The web app proxies `/api/auth/*` requests server-side, so `NEXT_PUBLIC_API_BASE_URL` is not used for customer API requests. Local development defaults to `http://localhost:3000`.

## Supabase Admin Portal access

The Admin Portal login uses Supabase Auth and does not expose public administrator registration.

1. In Supabase Dashboard, create the administrator account under **Authentication → Users**.
2. Edit that user's **app metadata** and set `admin_role` to `super_admin`, for example:

   ```json
   { "admin_role": "super_admin" }
   ```

3. Sign in at `/admin/login` with that account's email and password.

Do not put the role in user metadata; users can edit their own user metadata. Only trusted app metadata is accepted by the admin gate.

The Admin Overview, Transaction Ledger, Users, Deposits, Audit Logs, and VTU Services pages read data through protected Supabase Edge Functions. Apply the corresponding SQL migrations in `supabase/migrations` before deploying their functions. The Audit Logs migration records new deposit and VTU transaction status events; it does not backfill audit history from the legacy database. The Provider Balances and VTU Services pages use live VTUGATE provider data; set its VTUGATE provider key as a Supabase Edge Function secret first. Optional funding-account and threshold secrets are listed below:

```bash
npx supabase functions deploy admin-overview
npx supabase functions deploy admin-transactions
npx supabase functions deploy admin-provider-balances
npx supabase functions deploy admin-users
npx supabase functions deploy admin-deposits
npx supabase functions deploy admin-audit-logs
npx supabase functions deploy admin-vtu-services
npx supabase functions deploy admin-vtu-plans
```

Set `VTUGATE_API_KEY` (or `VTU_GATE_API_KEY`) in Supabase Edge Function secrets. Optionally set `VTUGATE_BASE_URL` (or `VTU_GATE_BASE_URL`), `VTUGATE_LOW_BALANCE_THRESHOLD_NAIRA` (default `500000`), `VTU_GATE_PAYVESSEL_ACCOUNT`, `VTU_GATE_PAYVESSEL_ACCOUNT_NAME`, `VTU_GATE_PAYMENTPOINT_ACCOUNT`, and `VTU_GATE_PAYMENTPOINT_ACCOUNT_NAME`. Funding-account details are only returned when both the account number and name for that option are configured.

Other admin pages and administrative actions are still being migrated separately.
On the Users page, blocking/unblocking accounts and wallet adjustments remain unavailable until their audited Supabase mutations are migrated; do not use the legacy API for these actions from the Supabase-authenticated admin portal.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
