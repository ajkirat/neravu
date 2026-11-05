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
React 18 + TypeScript + Vite + Tailwind CSS v4. Data is currently persisted in `localStorage` (seeded with demo data) – a backend is the next step.

## Run
```bash
npm install
npm run dev
```
