# Saffron Table — Restaurant Booking

A complete, responsive restaurant reservation site with a password-protected staff dashboard. The frontend is plain HTML, CSS, and JavaScript; the backend is a set of Node.js Vercel Functions; bookings are stored in Supabase.

## Features

- Customer reservations with required-field, future-date, guest-count, and service-hour validation
- Restaurant hours restricted to 10:00 AM–11:59 PM (Asia/Kolkata)
- Clear confirmation screen with a public booking ID
- Staff session stored in a signed, HttpOnly, SameSite cookie
- Desktop booking table and mobile booking cards
- Today, tomorrow, yesterday, and all filters; name, phone, and ID search
- Pending, Confirmed, and Cancelled statuses with accessible color badges
- Summary counts, refresh, confirmed deletion, and filtered CSV export
- Supabase Row Level Security with no direct browser table access
- Responsive, keyboard-accessible interface and reduced-motion support

## Project structure

```text
api/
  _lib/                 Shared authentication, validation, and Supabase helpers
  staff/                Protected staff API functions
  bookings.js           Public booking-creation API
public/
  assets/css/            Shared responsive styles
  assets/js/             Customer and staff browser code
  index.html             Customer booking page
  staff.html             Staff login and dashboard
supabase/schema.sql      Database schema, constraints, indexes, and RLS
test/                    Node.js tests
vercel.json              Routes and security headers
```

## 1. Supabase setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it.
3. In **Project Settings → API**, copy the project URL and the `service_role` key. Keep the service-role key secret. Do not use the anon key for the backend.

The SQL enables and forces RLS, revokes access from `anon` and `authenticated`, and grants access only to `service_role`. Customer inserts and all staff operations therefore go through the API.

## 2. Local setup

Requirements: Node.js 20 or later and npm.

```bash
npm install
Copy-Item .env.example .env.local
```

Fill in `.env.local`:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STAFF_PASSWORD=a-long-unique-staff-password
SESSION_SECRET=a-separate-random-string-with-at-least-32-characters
```

Generate a suitable signing secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Start the Vercel-compatible local server. This command securely loads `.env.local` into the Vercel process:

```bash
npm run local
```

Open `http://localhost:3000` for the customer page and `http://localhost:3000/staff` for the dashboard.

## 3. Tests

```bash
npm test
npm run check
```

The tests cover booking validation, future/service-hour rules, secure staff authentication, protected staff access, Supabase insertion, and allowed status values.

## 4. Deploy to Vercel

1. Push this folder to a Git repository and import it in Vercel, or run `npx vercel` from this folder.
2. Do not select a framework preset; Vercel detects the static pages and `/api` Node.js functions.
3. In **Project Settings → Environment Variables**, add these to Production, Preview, and Development as appropriate:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (mark sensitive)
   - `STAFF_PASSWORD` (mark sensitive)
   - `SESSION_SECRET` (mark sensitive; at least 32 characters)
4. Redeploy after adding or changing variables.

For CLI-based local synchronization, link first and then pull variables:

```bash
npx vercel link
npx vercel env pull .env.local
```

`vercel env pull` replaces the target file, so preserve any custom local-only values first.

## Security notes

- `.env.local` and all `.env.*` files except `.env.example` are ignored by Git.
- The service-role key and staff password are read only inside Node.js functions.
- Staff sessions expire after eight hours and are integrity-protected with HMAC-SHA256.
- Production cookies are `Secure`, `HttpOnly`, and `SameSite=Strict`.
- API errors shown to users are generic; database details are logged only on the server.
- CSV cells beginning with spreadsheet formula characters are escaped.

For a real multi-employee operation, replace the shared password with individual accounts using an identity provider, add audit logging, and apply a distributed rate limiter to the login endpoint.
