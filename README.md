# MR-Payment-Gateway

A mobile-first Next.js checkout scaffold for **approved bKash and Nagad merchant integrations**. It includes server-side payment initiation, a PostgreSQL transaction database, idempotency keys, a read-only admin dashboard, and a callback that treats browser redirects as untrusted signals.

> **Important:** This repository is integration scaffolding, not a licensed payment processor. Do not accept live payments until your provider has approved your merchant account and the exact merchant integration documentation has been implemented and tested. bKash can be configured with the Tokenized Checkout API pattern in `lib/providers/bkash.ts`. The Nagad adapter intentionally fails closed until the merchant-specific signature/encryption flow from the official integration pack is implemented. No credentials are included.

## Features
- Responsive checkout UI
- Node.js server routes; secrets are not exposed through `NEXT_PUBLIC_*`
- PostgreSQL via Prisma
- Amount validation (BDT 10–50,000, integer amounts only)
- Unique order IDs and unique idempotency keys
- Provider verification before a transaction can be marked completed
- Amount/currency/payment-ID checks where returned by provider
- Admin API key protected, read-only transaction list
- Security headers and no-store requests for provider calls
- `.env.example` with obvious placeholders

## Requirements
- Node.js 20+
- PostgreSQL database with TLS in production
- Approved bKash and/or Nagad merchant account and current official API credentials

## Local setup
1. Create a PostgreSQL database.
2. Copy `.env.example` to `.env.local`.
3. Set `DATABASE_URL`, `APP_BASE_URL`, and a random `ADMIN_API_KEY` of at least 32 characters. Keep secrets private.
4. Install and initialize:

   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   npm run dev
   ```

5. Open `http://localhost:3000`.

The provider adapters are disabled by default. Checkout initiation will fail safely until provider settings are configured.

## bKash configuration
Use the exact base URL and API version supplied in your bKash merchant integration pack. Populate `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD`, and `BKASH_CALLBACK_URL`; set `BKASH_ENABLED=true` only after testing against the provider's sandbox. Sandbox and production credentials are separate. Review the response fields and verification endpoints against the current official documentation before production use.

## Nagad configuration
Populate the variables from your approved Nagad merchant pack. The adapter in `lib/providers/nagad.ts` is deliberately disabled/fail-closed: Nagad's required signing, encryption and verification must be implemented against the exact official merchant specification. Do not replace this with a client-side “success” flag or accept a redirect alone. Keep `NAGAD_ENABLED=false` until the implementation is completed and independently tested.

## Deploy to Vercel
1. Push this project to a private GitHub repository.
2. Import the repository into Vercel.
3. Add a managed PostgreSQL database (with TLS) and set all environment variables in Vercel Project Settings. Do not upload `.env.local`.
4. Set `APP_BASE_URL` to the exact HTTPS production origin and set each provider callback URL to the corresponding public callback route.
5. Run `npx prisma db push` against the production database as a controlled deployment step (or migrate to reviewed Prisma migrations before production).
6. Deploy and test using sandbox credentials first. Confirm successful, failed, cancelled, duplicated and delayed callbacks. Only then request provider production credentials.

## API
### `POST /api/payments/create`
Headers: `Content-Type: application/json`, `Idempotency-Key: <UUID>`
Body: `{"provider":"BKASH","amount":100}` or `{"provider":"NAGAD","amount":100}`

The response contains a provider checkout URL only when the server successfully creates a checkout. Configuration/provider errors return non-2xx responses.

### `GET /api/payments/callback?provider=BKASH&paymentID=...`
Callback signals are not trusted as proof. The server looks up the known transaction and calls the provider adapter to verify payment status, payment ID, amount and currency where available. The callback path can also be reached through `/api/payments/callback/bkash` or `/api/payments/callback/nagad`; confirm the exact callback format with the merchant docs.

### `GET /api/admin/transactions`
First POST `{"key":"..."}` to `/api/admin/login` to receive a short-lived HttpOnly, SameSite=Strict cookie. Then request this endpoint from the same browser session. Returns at most 100 recent transactions; read-only.

## Production hardening checklist
- [ ] Complete Nagad adapter from official merchant documentation and test signature/encryption validation.
- [ ] Validate bKash API version, endpoints, response codes and status semantics against current official documentation.
- [ ] Use Prisma migrations and a managed PostgreSQL database with backups.
- [ ] Add rate limiting/WAF at the edge, monitoring, alerting and structured redacted logs.
- [ ] Add a proper admin login/session with MFA rather than distributing the admin API key to multiple people.
- [ ] Add reconciliation job using provider status APIs and idempotent state transitions.
- [ ] Ensure callback endpoints match provider requirements and validate any webhook signature exactly as documented.
- [ ] Complete provider sandbox certification and obtain written production approval.
- [ ] Add legal business terms, refund/dispute handling, privacy notice and support contact.

## Security notes
- Never commit real secrets or database URLs.
- Do not trust client-provided payment status, amount, or provider transaction ID.
- Never ask users for their payment PIN or OTP.
- Use HTTPS in production.
- This starter does not store card details or payment PINs.
