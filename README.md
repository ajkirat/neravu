# Neravu

Neravu is a PG (paying guest) and hostel management web app for **owners**. It keeps properties,
rooms, beds, tenants, rent, dues and expenses in one place, so month-end is a glance rather than a
hunt through notebooks and chats.

> Owner-side only for now. There is no tenant-facing app yet.

## What owners can do

| Area | Features |
| --- | --- |
| **Properties, rooms, beds** | Add multiple PGs; add rooms with a sharing type (1 to 8 beds) and per-bed rent; beds are created automatically. Bed map shows occupied, on-notice and vacant beds, with dues per bed. Resize, edit or delete rooms safely (occupied beds are protected). |
| **Tenant onboarding** | Assign a tenant to a vacant bed with contact details, ID proof (KYC) number, emergency contact, occupation, rent, rent due day and security deposit. Optionally record the amount collected at move-in. |
| **Automatic rent billing** | Rent is raised automatically each month: the first month on the move-in date, then on the tenant's due day (1 to 28). No cron job; dues are brought up to date whenever the owner opens the app. |
| **Payments and receipts** | Record UPI, cash, bank, card or other payments with a reference number. Payments are applied to the oldest dues first. Printable receipt for every payment. |
| **Dues tracking** | Per-tenant statement with a running balance, pending amount, "pending since" date and days overdue. Extra charges (electricity, maintenance, other) and rent waivers. |
| **Reminders** | One-tap WhatsApp reminder (click-to-chat link with a pre-filled, polite message including the amount and since-when). |
| **Notice and move-out** | Record notice with an expected move-out date, withdraw notice, move out (frees the bed and stops billing), shift a tenant to another bed, and record a deposit refund. |
| **Expenses** | Log expenses by category (groceries, salaries, electricity, etc.) per property or as general overhead, with a monthly category breakdown. |
| **Dashboard** | Occupancy, pending dues, this month's collections and expenses, a "dues to collect" list with remind/collect actions, rent due this week, upcoming move-outs and occupancy by property. |
| **Reports** | Monthly billed vs collected vs expenses vs net, by property; a six-month collections and expenses trend; dues export to CSV. |
| **Scan a bill** | Take a photo of a bill in Expenses. The shop, date, category and each item are filled in and the total adds up by itself. You check, fix anything, and save. Works with printed or handwritten bills in English, Kannada or Telugu. Items are kept with each expense. The photo is read, then thrown away: Neravu does not store it. |
| **Account safety** | Forgot-password by email (1-hour one-time link), email verification, a reset signs out other sessions, and login attempts are rate limited. Links are stored hashed. |
| **Kannada, Telugu and English** | Switch the whole app (menus, forms, messages) with one tap. WhatsApp reminders and the tenant pay page go out in each tenant's own language. Remembered on your account across devices. Translations should be reviewed by a native speaker. |
| **Made for everyone** | Big picture buttons on the home screen, a "More" screen of large tiles, one-tap "Paid cash / Paid UPI" for dues, voice typing for notes (Chrome), a large-text switch, a plain-language Help page, and install-to-home-screen. |
| **Complaints** | Write down tenant problems (by voice or typing) and mark them open, being fixed or fixed. |
| **Online pay links (UPI)** | Add your UPI ID in Settings. Every tenant gets a private pay link (`/pay/...`) showing what they owe, a "Pay with UPI app" button and a QR code. Money goes straight to your UPI ID. Tenants tap "I've paid" and you confirm by recording the payment. |
| **Remind overdue** | One queue of everyone with pending dues, sorted by how late they are, with a WhatsApp button for each (pay link included) and a "reminded on" marker. |
| **Leads and enquiry QR** | Print a QR poster per property. Scanning it opens a public enquiry form and the lead lands in your Leads list. Track status (new, contacted, visit, won, lost) and follow-up dates, add leads by hand, one-tap WhatsApp. |
| **Rent agreement** | A printable agreement for each tenant, filled in from their details (rent, deposit, due day, bed, ID). It is a standard template, not legal advice. |

The feature set is benchmarked against the owner side of popular Indian PG apps (such as RentOk),
but the product, design and branding are Neravu's own.

## Tech stack

- **[Next.js 16](https://nextjs.org/)** (App Router, React Server Components, Server Actions) with **React 19** and **TypeScript**
- **[Prisma 7](https://www.prisma.io/)** ORM with **PostgreSQL** (via the `@prisma/adapter-pg` driver adapter), so it runs the same locally and on Vercel
- **[Tailwind CSS 4](https://tailwindcss.com/)** for styling (brand tokens in `src/app/globals.css`)
- **Auth:** email and password (bcrypt hashes) with a signed, HTTP-only JWT session cookie (`jose`)
- **Validation:** `zod` and small form helpers
- **Tests:** `vitest` for the billing and ledger logic

### Project layout

```
prisma/
  schema.prisma        Data model (Owner, Property, Room, Bed, Tenant, Charge, Payment, Expense)
  migrations/          SQL migrations
  seed.ts              Demo data
src/
  app/
    (auth)/            Login and signup
    (app)/             Signed-in owner area: dashboard, properties, tenants, payments, expenses, reports
    actions/           Server actions (all scoped to the signed-in owner)
  components/          UI building blocks
  lib/
    billing.ts         Pure rent-period and ledger logic (unit tested)
    ledger.ts          Keeps rent charges current and computes tenant balances
    auth.ts, db.ts     Session and database clients
```

### How dues work

- Every amount a tenant owes is a **charge** (`RENT`, `DEPOSIT`, `ELECTRICITY`, `MAINTENANCE`, `OTHER`).
- Every amount received is a **payment** (refunds are stored as negative payments).
- Outstanding = charges that have fallen due minus payments. Payments are applied oldest first,
  which gives the "pending since" date and days overdue.
- Rent charges are created lazily for every month that has fallen due (`syncRentCharges`), and are
  unique per tenant and month, so they are never duplicated. Waiving a month sets it to zero.

All money is stored as whole rupees. Calendar dates are stored as UTC midnight and "today" is
computed in `APP_TIMEZONE` (default `Asia/Kolkata`).

## Getting started

Requirements: **Node.js 20.19+** (22 LTS recommended), npm, and a **PostgreSQL** database
(a free [Neon](https://neon.tech) database works well, or a local Postgres).

```bash
git clone https://github.com/ajkirat/neravu.git
cd neravu
cp .env.example .env          # set DATABASE_URL and a long random AUTH_SECRET
npm install                   # also generates the Prisma client
npx prisma migrate deploy     # creates the tables
npm run db:seed               # optional: demo data
npm run dev
```

Open http://localhost:3000. With demo data loaded, log in as **demo@neravu.app** / **demo1234**,
or create your own owner account.

### Environment variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/neravu` |
| `DATABASE_URL_UNPOOLED` | Optional. Direct (non-pooled) connection used only for migrations. Vercel + Neon sets it automatically. |
| `AUTH_SECRET` | Secret used to sign session cookies. Required in production. Generate with `openssl rand -base64 32`. |
| `RESEND_API_KEY` / `EMAIL_FROM` | Optional. Turns on password-reset and email-verification emails via [Resend](https://resend.com) (free tier). `EMAIL_FROM` looks like `Neravu <noreply@yourdomain.com>` on a domain you verified in Resend. Without them the app works, and the forgot-password page says email is not set up. |
| `ANTHROPIC_API_KEY` | Optional. Turns on **bill scanning** in Expenses (Claude reads the photo). Get a key at console.anthropic.com. Each scan has a small cost on your Anthropic account. Without it, the Scan button is disabled and manual entry works as before. `ANTHROPIC_MODEL` can override the default model. |
| `APP_URL` | Optional. Public address used in links sent to tenants, e.g. `https://neravu.example.com`. Detected from the request when unset. |
| `APP_TIMEZONE` | Optional. Timezone used for "today" when billing rent. Defaults to `Asia/Kolkata`. |

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm run vercel-build` | What Vercel runs: apply migrations, then build |
| `npm test` | Run unit tests |
| `npm run lint` | Type-check the project |
| `npm run db:migrate` | Create and apply a migration after changing `schema.prisma` |
| `npm run db:seed` | Load demo data (replaces the demo owner only) |
| `npm run db:reset` | Wipe the database and reseed |

## Deploy on Vercel

1. In Vercel choose **Add New → Project** and import this repository (framework: Next.js is detected).
2. Before the first deploy, open the project's **Storage** tab, create a **Neon** Postgres database and connect it to the project.
   It adds `DATABASE_URL` (and `DATABASE_URL_UNPOOLED`) for you.
3. Under **Settings → Environment Variables** add `AUTH_SECRET` (output of `openssl rand -base64 32`).
4. Deploy. The build runs `prisma migrate deploy` (via `vercel-build`), so tables are created automatically.
5. Optional: load the demo owner into the new database with
   `DATABASE_URL="<your connection string>" npm run db:seed` from your machine.

New migrations are applied automatically on each deploy.

## Roadmap

Ideas for the next iterations:

- Tenant app: self-service payments, receipts, complaints and notices
- Online rent collection (UPI collect / payment links) with automatic reconciliation
- Scheduled reminders over WhatsApp or SMS
- KYC document uploads and digital rental agreements
- Pro-rated first and last month rent, late fees
- Electricity meter readings split per room
- Staff accounts with roles, complaints and maintenance tickets
- Food menu and attendance
