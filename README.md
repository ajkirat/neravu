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
| **Add many rooms at once** | On a property, describe your numbering instead of typing rooms one by one: pick a style (101/201, G1/11, 1-2-3, A-101, A1/B1) and set floors and rooms per floor, or type or paste a list with ranges (`101-110, 201-210, G1, Rose`) or rows copied from Excel with beds and rent. Every row is previewed and editable, clashes are flagged, and up to 300 rooms with their beds are created in one go. |
| **Electricity bills** | Enter each room's bill (a total, or meter readings x rate) and Neravu splits it by the days each person stayed, to the rupee. Preview the shares, add them to tenants' dues in one tap, and undo if you made a mistake. |
| **Caretaker access** | Give a caretaker or manager their own sign-in (mobile number + password). They can record payments, log complaints, follow up leads and send reminders, and every payment carries their name. They cannot see profit, expenses, reports, settings or ID details, and cannot delete anything. Switch one off and they are signed out at once. |
| **Download your data** | Tenants, payments, rent and charges, expenses, rooms, leads and complaints as spreadsheets (Kannada and Telugu show correctly in Excel), plus a full JSON backup. Passwords and keys are never included. |
| **Automatic reminders** | Turn on once; WhatsApp messages then go out by themselves a chosen number of days before rent is due and repeat when it is overdue, in each tenant's own language, with the pay link. Nobody is messaged twice in a day, anyone who says they have paid is left alone, and it stops after 4 overdue messages for one month. See exactly who would get a message today and a log of everything sent. Needs WhatsApp to be connected (below). |
| **How tenants pay you** | Each owner picks one in Settings: **I collect it myself** (no pay links), **Direct to my UPI ID** (free; you confirm each payment), or **Razorpay** (optional, automatic). With Razorpay a tenant pays online and the payment is recorded and receipted for you with no typing. Each owner uses their own Razorpay account, so the money goes straight to them and never through Neravu. Keys are stored encrypted. |
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
| `ENCRYPTION_KEY` | Optional. Encrypts saved third-party keys (Razorpay). Defaults to `AUTH_SECRET`. **If you change it, saved Razorpay keys stop working and must be entered again.** |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | Optional. Connects a WhatsApp Business account so Neravu can send automatic reminders (see *Automatic WhatsApp reminders* below). `WHATSAPP_TEMPLATE_DUE` and `WHATSAPP_TEMPLATE_OVERDUE` override the template names (default `rent_due_soon` and `rent_overdue`). |
| `WHATSAPP_APP_SECRET` / `WHATSAPP_VERIFY_TOKEN` | Needed for **bills over WhatsApp** (incoming messages). The app secret is in Meta → your app → Settings → Basic; the verify token is any random string you also type into Meta's webhook form. Without the app secret, incoming messages are refused. |
| `WHATSAPP_DISPLAY_NUMBER` | Optional. The business number shown in the app ("send bills to +91 63634 62003"), e.g. `916363462003`. |
| `WHATSAPP_TEMPLATE_RECEIPT` | Optional. Template name for payment receipts (default `payment_receipt`). |
| `DEMO_OWNER_EMAILS` | Optional. Comma-separated emails of demo accounts that may wipe and refill themselves with sample data from Settings (default `demo@neravu.app`). Never put a real owner here. |
| `INBOUND_EMAIL_DOMAIN` / `INBOUND_EMAIL_SECRET` | Optional. Turn on **automatic payment confirmation from bank alert emails** (see *Confirming rent payments* below). The domain is the one whose email you route to Neravu (e.g. `in.yourdomain.com`); the secret is any long random string shared with the email worker. |
| `BANK_EMAIL_DOMAINS` | Optional. Extra bank email domains to accept, comma-separated, if an owner's bank is not in the built-in list. |
| `CRON_SECRET` | Required for the daily reminder job. Any long random string; Vercel sends it to the job automatically. Without it the job refuses to run. |
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

## Automatic WhatsApp reminders (one-time setup by whoever runs Neravu)

Owners switch the feature on in the app. Sending uses **one WhatsApp Business account** that you connect once, through Meta's WhatsApp Cloud API. Neravu does not work around Meta's rules: business messages must use **pre-approved templates**.

1. Create a WhatsApp Business account and a phone number in [Meta for Developers](https://developers.facebook.com) (WhatsApp → API setup). Create a permanent access token (a System User token).
2. In WhatsApp Manager create **two templates**, category *Utility*, each in **English, Kannada and Telugu**, with exactly **4 variables** in this order: `{{1}}` tenant first name, `{{2}}` PG name, `{{3}}` amount, `{{4}}` pay link (or the owner's phone when online payment is off). Suggested texts:

   `rent_due_soon`
   - en: `Hi {{1}}, a friendly reminder from {{2}}: your rent of {{3}} is due soon. Pay or contact: {{4}}. Thank you!`
   - kn: `ನಮಸ್ಕಾರ {{1}}, {{2}} ಕಡೆಯಿಂದ ನೆನಪೋಲೆ: ನಿಮ್ಮ {{3}} ಬಾಡಿಗೆ ಶೀಘ್ರದಲ್ಲೇ ಬಾಕಿ ಆಗಲಿದೆ. ಪಾವತಿ ಅಥವಾ ಸಂಪರ್ಕ: {{4}}. ಧನ್ಯವಾದಗಳು!`
   - te: `నమస్కారం {{1}}, {{2}} నుండి రిమైండర్: మీ {{3}} అద్దె త్వరలో గడువు కానుంది. చెల్లింపు లేదా సంప్రదింపు: {{4}}. ధన్యవాదాలు!`

   `rent_overdue`
   - en: `Hi {{1}}, this is a gentle reminder from {{2}}: your pending rent of {{3}} is overdue. Pay or contact: {{4}}. Thank you!`
   - kn: `ನಮಸ್ಕಾರ {{1}}, {{2}} ಕಡೆಯಿಂದ ನೆನಪೋಲೆ: ನಿಮ್ಮ ಬಾಕಿ ಬಾಡಿಗೆ {{3}} ತಡವಾಗಿದೆ. ಪಾವತಿ ಅಥವಾ ಸಂಪರ್ಕ: {{4}}. ಧನ್ಯವಾದಗಳು!`
   - te: `నమస్కారం {{1}}, {{2}} నుండి రిమైండర్: మీ బకాయి అద్దె {{3}} ఆలస్యమైంది. చెల్లింపు లేదా సంప్రదింపు: {{4}}. ధన్యవాదాలు!`

   Meta reviews every template (usually minutes to a day) and may ask for small wording changes. Keep the 4 variables and their order.
3. In Vercel add `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` and `CRON_SECRET`, then redeploy. `vercel.json` already schedules the daily job (09:00 IST).
4. In the app open **Auto reminders**: it says "WhatsApp is connected". Use *Send a test message to my phone* before turning it on for real.

5. **Payment receipts**: create a third Utility template `payment_receipt` (en, kn, te) with **5 variables**: `{{1}}` first name, `{{2}}` amount, `{{3}}` PG name, `{{4}}` date · method · receipt no., `{{5}}` what is still pending. Suggested text:
   - en: `Hi {{1}}, {{3}} received {{2}} from you ({{4}}). {{5}}. Thank you!`
   - kn: `ನಮಸ್ಕಾರ {{1}}, {{3}} ನಿಮ್ಮಿಂದ {{2}} ಸ್ವೀಕರಿಸಿದೆ ({{4}}). {{5}}. ಧನ್ಯವಾದಗಳು!`
   - te: `నమస్కారం {{1}}, {{3}} మీ నుండి {{2}} అందుకుంది ({{4}}). {{5}}. ధన్యవాదాలు!`

   Receipts go out after every payment (cash, UPI, Razorpay) while the owner keeps "Send a WhatsApp receipt" ticked on the Auto reminders page.

Meta charges per conversation after a free monthly allowance; check their current pricing.

## Confirming rent payments

Only three things ever mark rent as paid; nothing a tenant sends (screenshot, UTR, "I've paid") counts by itself.

- **B – recorded by the person who saw it.** Cash or UPI paid at the desk, recorded by the owner or a caretaker. Always on.
- **A – the owner checks and taps OK** (default). The tenant pays from their My PG link: the UPI app opens with an exact amount (e.g. ₹8,500.**37** – the paise are unique per tenant) and a note. The tenant taps "I've paid" (optionally with the UTR); reminders stop; the owner sees it in the **Today** list, finds that exact amount in their UPI app and taps ✓ Received (or ✗ Not received). The receipt goes out automatically.
- **C – automatic from bank alert emails.** The owner forwards their bank's credit alerts to a private Neravu address once (a Gmail filter). Neravu checks the email's DKIM signature belongs to a known bank, that the alert is for the owner's account (last 4 digits), and that the paise match exactly one tenant – then records the payment and sends the receipt. Anything it cannot match appears in **Today** as "₹X came into your bank – whose is it?".
- With **Razorpay** connected, payments are confirmed by Razorpay's signed webhook and the unverifiable paths (direct UPI, "I've paid") are hidden.

The owner picks A or C in **Settings → How rent payments are confirmed**.

Setting up C (once, by whoever runs Neravu):
1. Use a domain (or sub-domain) on Cloudflare and turn on **Email Routing**.
2. Create an **Email Worker** from `docs/bank-email-worker.js`, set its variables `NERAVU_URL` and `INBOUND_EMAIL_SECRET`, and route `pay-*@<domain>` (or catch-all) to it.
3. In Vercel set `INBOUND_EMAIL_DOMAIN=<domain>` and the same `INBOUND_EMAIL_SECRET`, then redeploy.
4. Each owner then sees their own `pay-<code>@<domain>` address and the Gmail steps in Settings. Gmail's forwarding confirmation link shows up on that page automatically.

## Bills over WhatsApp

A caretaker (or the owner) sends a photo of a bill to the business number. Neravu reads it and replies *"Is this an expense? ₹1,200 · Groceries · Sri Ganesh Stores"* with **Yes / No** buttons. On *Yes* the expense, its items and the bill photo are saved under Expenses. Nothing else is needed in the app.

- The sender is recognised by their mobile number: a caretaker added on the **Caretakers** page, or the owner's mobile in **Settings**. Unknown numbers get a polite "ask your owner" reply.
- Typed answers work too: yes / haan / ಹೌದು / అవును, no / illa / ಇಲ್ಲ / వద్దు.
- Needs `ANTHROPIC_API_KEY` (bill reading) and the WhatsApp variables above.

Setup, once:
1. In Meta for Developers → your app → WhatsApp → Configuration → **Webhook**: callback URL `https://<your-app>/api/webhooks/whatsapp`, verify token = `WHATSAPP_VERIFY_TOKEN`. Click *Verify and save*.
2. Subscribe the webhook to the **messages** field.
3. Add `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` and `WHATSAPP_DISPLAY_NUMBER` in Vercel and redeploy.

Note: a number connected to the Cloud API cannot be used in the normal WhatsApp Business phone app at the same time (unless Meta's coexistence option is enabled for it). Until WhatsApp is connected, the switch stays off and the manual WhatsApp buttons keep working.

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
