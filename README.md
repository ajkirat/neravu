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
React 18 + TypeScript + Vite + Tailwind CSS v4 on the front end; Express + SQLite (`node:sqlite`, Node 22+) on the back end.

- Owner accounts: email + password (scrypt-hashed), signed HttpOnly cookie sessions, throttled auth endpoints.
- Every owner's data is isolated by account and stored in `data/neravu.db`.

## Run
```bash
npm install
npm run dev        # API on :3001 + Vite dev server
```

Production: `npm run build && NODE_ENV=production npm start` (serves the API and the built app on `PORT`, default 3001).

Environment: `PORT`, `DATA_DIR` (default `./data`), `SESSION_SECRET` (default: generated and stored in `DATA_DIR/.secret`).
Back up `DATA_DIR`. Serve over HTTPS in production (the session cookie is `Secure` when `NODE_ENV=production`).
