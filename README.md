# Neravu

PG (paying guest) management web app for PG owners, modelled on RentOk's owner features.

## Features
- **Dashboard** – occupancy, vacant beds, collected / pending rent, expenses, profit, overdue list
- **Properties & Rooms** – multiple PGs, rooms, bed-level occupancy
- **Tenants** – onboarding with ID/KYC details, KYC status, notice period, check-out
- **Rent & Payments** – monthly invoice generation, partial payments, payment modes, WhatsApp reminders
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
