# Deploying Potluck Photos to Vercel

## 1. Import the repo
On [vercel.com](https://vercel.com) → **Add New → Project** → import `PotluckPhotos/potluck-photos`.
Vercel auto-detects Next.js — no build settings to change.

## 2. Environment variables
Add these under **Settings → Environment Variables** (values come from your
Supabase and Cloudflare R2 dashboards — the same ones in `.env.local`):

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API Keys (publishable) |
| `SUPABASE_SECRET_KEY` | Supabase → Settings → API Keys (secret) |
| `STORAGE_PROVIDER` | `r2` |
| `STORAGE_BUCKET` | `potluck-photos` |
| `STORAGE_ACCOUNT_ID` | R2 S3 endpoint host |
| `STORAGE_ACCESS_KEY_ID` | R2 API token |
| `STORAGE_SECRET_ACCESS_KEY` | R2 API token |
| `STORAGE_PUBLIC_URL` | `https://cdn.potluck.photos` |
| `RESEND_API_KEY` | (optional) Resend, for email invites |
| `INVITE_FROM_EMAIL` | (optional) verified Resend sender |

## 3. Custom domain
**Settings → Domains** → add `potluck.photos`. Vercel gives a DNS record — add it
in Cloudflare DNS and set that record to **DNS only** (grey cloud), not proxied,
to avoid the SSL-mode redirect loop.

## 4. Post-deploy config (these live in other dashboards)
- **Supabase → Authentication → URL Configuration**: set **Site URL** to
  `https://potluck.photos` and add it (plus the `*.vercel.app` preview URL if you
  want previews to work) to **Redirect URLs**. Without this, Google login and
  email confirmation redirect to the wrong place.
- **Google Cloud → Auth Platform → Clients**: add `https://potluck.photos` to
  **Authorized JavaScript origins**. The redirect URI (the Supabase callback)
  stays the same.
- **Cloudflare R2 → bucket → CORS**: `https://potluck.photos` is already allowed.
  To test photo uploads on a Vercel **preview** URL, also add that `*.vercel.app`
  origin, or uploads there will be blocked by CORS.

## 5. Database
Make sure all migrations in `supabase/migrations/` have been run in the Supabase
SQL Editor (0001 → 0005). New environments need them applied once.
