# Neravu

PG (paying guest) management web app for PG owners, modelled on RentOk's owner features.

## Features
- **Dashboard** – occupancy, vacant beds, collected / pending rent, expenses, profit, overdue list
- **Properties & Rooms** – multiple PGs, rooms, bed-level occupancy
- **Tenants** – ID/KYC details, notice, per-tenant ledger (passbook), printable rent agreement, check-out with deposit settlement (dues + damages deducted, refund calculated)
- **Rent & Payments** – monthly invoice generation, partial payments, payment modes, printable/WhatsApp-shareable receipts, WhatsApp reminders
- **Online rent via UPI** – set your UPI ID once; reminders then carry a pay link to a public page with a UPI deep link and QR code. Tenants tap “I’ve paid” and you confirm by recording the payment. (Money goes straight to your UPI ID; there is no payment gateway, so payments aren’t auto-verified.)
- **Bulk reminders** – one queue of all overdue tenants with WhatsApp links, tracking who was reminded and when
- **Leads** – enquiry pipeline (new → contacted → visit → won/lost) with follow-up dates; each property gets a printable QR code that opens a public enquiry form and drops leads straight into your list
- **Expenses** – categorised expense tracking
- **Complaints** – log and track tenant issues
- **Reports** – 6-month income vs expense, occupancy by property, CSV export
- **Settings** – PG details, due day, reminder template

## Stack
React 18 + TypeScript + Vite + Tailwind CSS v4 on the front end; Express on the back end with a storage adapter:
**Postgres** when `DATABASE_URL`/`POSTGRES_URL` is set (hosted), otherwise a local **SQLite** file (`node:sqlite`, Node 22+).

- Owner accounts: email + password (scrypt-hashed), signed HttpOnly cookie sessions, throttled auth endpoints.
- Every owner's data is isolated by account.

## Run locally
```bash
npm install
npm run dev        # API on :3001 + Vite dev server, data in ./data (SQLite)
```

## Deploy on Vercel
Vercel has no persistent disk, so it needs a hosted Postgres.

1. Import this repo in Vercel (framework: Vite — `vercel.json` already sets build, output and rewrites).
2. In the project's **Storage** tab, add a **Neon Postgres** database (Marketplace). It injects `DATABASE_URL` / `POSTGRES_URL` automatically.
3. Add an environment variable `SESSION_SECRET` (any long random string, e.g. `openssl rand -hex 32`). The app refuses to start without it.
4. Deploy. Tables are created automatically on the first request.

`/api/*` is served by `api/index.mjs` (Express as one serverless function); everything else is the static SPA.

Notes: the login/enquiry rate limits are in-memory per function instance, so they only slow bursts. Tenant pay links and enquiry QR codes use the deployed URL, so print QR posters *after* your final domain is set.

## Self-host
`npm run build && NODE_ENV=production npm start` serves API + app on `PORT` (default 3001). Environment: `PORT`, `DATA_DIR` (default `./data`), `SESSION_SECRET` (default: generated into `DATA_DIR/.secret`), or `DATABASE_URL` for Postgres.
