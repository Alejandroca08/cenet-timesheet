# CENET Timesheet & Invoice System — Claude Code Project Prompt

## What this project is

A web application for CENET SA's ~10 independent contractor partners to automate the monthly invoicing process. Currently, each partner tracks tasks in a local Excel, manually reports them to the product manager (PM) via chat/email, registers hours separately, and sends a "cuenta de cobro" (invoice) by email. This app centralizes everything: task logging, hour tracking, financial calculations (retención, aportes, planilla), invoice generation, and batch email delivery — all with strict per-partner data isolation.

**This is a partner-facing tool only. The PM does NOT have access to this system.** The partners use it to streamline their own process of preparing and sending cuentas de cobro to the PM.

---

## Tech stack

- **Frontend:** React (Vite), using shadcn/ui components, Tailwind CSS, Framer Motion for animations
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions) — self-hosted on rasorbit.com VPS
- **Automation:** n8n workflows (hosted on rasorbit.com VPS) for month-end processing, PDF generation, email delivery, Telegram bot
- **Notifications:** Telegram bot (primary) + email (fallback)
- **Hosting:** Frontend on Vercel or Supabase hosting; backend is the self-hosted Supabase instance; n8n on the VPS

### CRITICAL: Supabase schema configuration

All CENET tables live in the `cenet` schema (NOT `public`) to avoid conflicts with other projects on the same Supabase instance.

**This affects EVERY Supabase query in the entire app.** The Supabase client must be initialized with a schema-aware helper:

```js
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'cenet' }
})
```

By setting `db.schema` in the client options, ALL queries automatically target the `cenet` schema — no need to call `.schema('cenet')` on every query. Just use `supabase.from('partners').select('*')` normally.

**Important:** Auth still lives in the `auth` schema (managed by Supabase). The `partners.id` references `auth.users.id`. Auth operations (`supabase.auth.signUp()`, `supabase.auth.signInWithPassword()`) are unaffected by the schema setting.

**PostgREST config (already done on VPS):** The `PGRST_DB_SCHEMAS` env var in docker-compose.yml must include `"public,cenet"` for the API to expose the cenet schema.

---

## Database schema

The full SQL migration is in `cenet_timesheet_migration.sql` in the project root. Run it in Supabase SQL Editor. It creates:

### Tables (11)
1. **partners** — Each partner = one Supabase Auth user. Fields: full_name, cc_number (cédula), cc_issued_in, email, telegram_chat_id, hourly_rate (configurable per partner), bank_name, bank_account_type, bank_account_number, invoice_counter (sequential per partner), is_admin, is_active. The `id` IS `auth.users.id`.
2. **projects** — CENET project catalog (shared). Seeded with: MiPlataforma, MiNomina, MisFacturas, MiPlanilla, FacturasApp, Propensar.
3. **tasks** — Individual task entries. Fields: partner_id, project_id, task_description, task_date, day_of_week, week_number (1-5), hours, source (enum: manual | excel_upload | telegram), period_year, period_month.
4. **partner_periods** — Tracks each partner's readiness status per month. Fields: partner_id, period_year, period_month, status (enum: in_progress | ready | sent), marked_ready_at, sent_at. Unique constraint on (partner_id, period_year, period_month).
5. **partner_period_attachments** — Files attached to a period (planilla de seguridad social, exported Excel timesheet, other). Fields: partner_period_id, attachment_type (enum), file_url, file_name.
6. **invoices** — Generated cuentas de cobro. Fields: partner_id, invoice_number (sequential per partner), period_start_date, period_end_date, total_hours, hourly_rate (snapshot at generation time), total_amount, total_amount_words (Spanish text: "Un millón setecientos..."), pdf_url, sent_at.
7. **invoice_periods** — Join table linking one invoice to one or more months (supports combined invoices like Jan+Feb).
8. **oauth_tokens** — OAuth2 tokens for sending emails from each partner's own account. Fields: partner_id, provider (enum: google | microsoft), email_address, access_token, refresh_token, token_expires_at. Supports Gmail AND Outlook/Hotmail.
9. **audit_log** — Internal accountability. Fields: partner_id, action (enum with 12 values), details (JSONB).
10. **notifications** — Tracks all notifications. Fields: partner_id, type (enum: month_end_reminder, nudge_pending, invoice_ready, batch_sent, social_security_reminder), channel (enum: email | telegram), status (enum: pending | sent | failed), payload (JSONB), error.
11. **settings** — Global config (key-value JSONB). Seeded with: company_name, company_nit, smlmv, aportes_rates, retencion_rate, deadline_days, pm_email, batch_send_mode.

### Materialized View
- **partner_monthly_stats** — Pre-calculated financial data per partner per month: task_count, total_hours, days_worked, hours_by_project (JSONB), avg_hours_per_day, hourly_rate, gross_income, retencion_amount, net_after_retencion, ibc (40% of gross if >= SMLMV), aportes_required (boolean), aportes_salud, aportes_pension, aportes_arl, planilla_total, take_home, period_status. Refreshed via `refresh_monthly_stats()` function.

### Row Level Security (RLS)
- Every table has RLS enabled
- Partners can only read/write their own rows (WHERE partner_id = auth.uid())
- Admin users (is_admin = TRUE) can see all partners' readiness status and task counts, but NOT financial details (hourly_rate, amounts, aportes)
- The materialized view is accessed through security-definer functions: `get_my_monthly_stats()` for individual partners, `get_team_readiness()` for admins
- OAuth tokens are strictly private — only the token owner can access them
- Projects and settings are readable by all, writable only by admins

### Helper Functions
- `get_partner_period_hours(partner_id, year, month)` — sum of hours
- `get_partner_period_amount(partner_id, year, month)` — hours × rate
- `needs_social_security(partner_id, year, month)` — checks if 40% of gross >= SMLMV
- `next_invoice_number(partner_id)` — atomically increments and returns next invoice number
- `refresh_monthly_stats()` — refreshes the materialized view (call from n8n cron)

### Storage Buckets (create in Supabase Dashboard)
- **invoices** — Private. Path: `invoices/{partner_id}/{year}-{month}/cuenta_cobro_{invoice_number}.pdf`
- **attachments** — Private. Path: `attachments/{partner_id}/{year}-{month}/planilla.pdf` or `timesheet.xlsx`

### Enums
- task_source: manual, excel_upload, telegram
- period_status: in_progress, ready, sent
- attachment_type: planilla_seguridad_social, timesheet_excel, other
- oauth_provider: google, microsoft
- notification_type: month_end_reminder, nudge_pending, invoice_ready, batch_sent, social_security_reminder
- notification_channel: email, telegram
- notification_status: pending, sent, failed
- audit_action: task_created, task_updated, task_deleted, excel_uploaded, invoice_generated, invoice_sent, rate_changed, period_marked_ready, period_sent, attachment_uploaded, oauth_connected, oauth_revoked

### Settings seed data
```json
{
  "company_name": "COMERCIO ELECTRÓNICO EN INTERNET CENET SA",
  "company_nit": "830057860",
  "smlmv": { "amount": 1423500, "year": 2026, "currency": "COP" },
  "aportes_rates": { "salud": 0.125, "pension": 0.16, "riesgos_laborales": 0.00522, "total": 0.29022 },
  "retencion_rate": { "rate": 0.11, "description": "Retención en la fuente aplicada por la empresa" },
  "deadline_days": 3,
  "pm_email": "",
  "batch_send_mode": "manual"
}
```

---

## Excel template structure (what partners upload)

The Excel file `plantillaHorasTrabajadas2026.xlsx` has:
- **"Inicio" sheet**: Contains "Precio hora" (hourly rate)
- **12 monthly sheets** (Enero–Diciembre): Columns are Num Semana, Día, Fecha (Excel serial date), Tarea, Proyecto, Hora/Tarea, Hora/Día, Hora/Semana, Hora/Mes, Total a cobrar. Each day has up to 4 task rows. Weeks are labeled "semana 1" through "semana 5".
- **"proyectos" sheet**: List of project names

The Excel parser must:
1. Read the month sheet specified by the user
2. Convert Excel serial dates to real dates
3. Extract non-empty rows with a task description
4. Map the "proyecto" column to the projects table (fuzzy match if needed)
5. Extract "Hora/Tarea" as the hours value
6. Insert into the tasks table with source = 'excel_upload'
7. Handle the fact that dates are stored as Excel serial numbers (e.g., 46023 = Jan 2, 2026)

---

## Cuenta de cobro (invoice) template

The document `Cuenta_Cobro_19_-_Alejandro_Cataño.docx` is the template. Structure:

```
Bogotá D.C. {date}

Cuenta de cobro #{invoice_number}

COMERCIO ELECTRÓNICO EN INTERNET CENET SA
Nit. 830057860

DEBE A:

{partner_full_name}
CC. {cc_number} de {cc_issued_in}

LA SUMA DE:

{total_amount_words}  {total_amount_number}

Por concepto de:
- {total_hours} horas de recurso en {project_names} desde el {period_start_date} hasta el {period_end_date}.

Cordialmente,

{partner_full_name}
CC. {cc_number}
{bank_account_type} {bank_name} No. {bank_account_number}
```

Generate this as a PDF. The total_amount_words must be in Spanish (e.g., "Un millón setecientos cuarenta mil pesos"). Use a library for number-to-Spanish-words conversion.

---

## Colombian financial calculations

For independent contractors in Colombia:

1. **Gross income** = total_hours × hourly_rate
2. **Retención en la fuente** = gross_income × retencion_rate (currently 11%). This is withheld BY the company, not paid by the partner.
3. **Net after retención** = gross_income × (1 - retencion_rate)
4. **IBC (Ingreso Base de Cotización)** = gross_income × 40%. But ONLY if this value >= 1 SMLMV. If 40% of gross < SMLMV, no aportes are required.
5. **Aportes breakdown** (applied to IBC):
   - Salud: 12.5%
   - Pensión: 16%
   - Riesgos Laborales (ARL): 0.522%
   - Total: 29.022%
6. **Planilla total** = IBC × 29.022%
7. **Take-home** = net_after_retencion - planilla_total
8. **Timing**: Aportes for month N are paid in month N+1 (e.g., January income → planilla paid in February)

The `partner_monthly_stats` materialized view already calculates all of this. The React app should display it in the dashboard.

---

## Frontend design specification

### Aesthetic direction: Warm Editorial with cursor-following glow

- **Palette**: Cream background (#faf7f2), warm browns (#2c2418, #8b7355), terracotta accent (#c96442), sage green (#5b8a72) for success states, muted gold for warnings
- **Typography**: Outfit (sans-serif) for headings and UI labels, Source Serif 4 (serif) for body text, DM Mono (monospace) for numbers/financial data
- **Cursor effect**: A subtle radial gradient in terracotta (rgba(201,100,66,0.06)) follows the mouse cursor across the page background, like warm light on paper
- **Animations**: Staggered fade+slide-in on page load (cubic-bezier(0.16,1,0.3,1)), hover lifts on cards (translateY(-3px) with soft shadow), animated bar charts and donut charts, smooth task list slide-ins
- **Cards**: White (#fff) with 1px border (#e8ddd0), border-radius 18px, subtle box-shadow on hover
- **Featured stat card**: Dark (#2c2418) with cream text for the "Neto estimado" metric
- **Project colors**: FacturasApp=#c96442, MiPlanilla=#5b8a72, MiNomina=#8b7355, MisFacturas=#6b7b8d
- **Status pills**: In progress = amber bg/text, Ready = green, Sent = blue
- **"Marcar como listo" button**: Dark bg, turns green on click with checkmark, has hover lift effect
- **Planilla upload**: Dashed border dropzone that highlights terracotta on hover
- **Warning banners**: Warm amber background with amber text for social security reminders

The reference mockup is in `cenet_dashboard_final.jsx`. Use it as the source of truth for the visual direction.

### Screens to build

1. **Login** — Supabase Auth (email/password). Simple, clean, centered card with the warm aesthetic. No social login initially.

2. **Dashboard (main screen)** — The mockup. Shows:
   - Greeting with partner name and current month
   - Period status pill (in_progress / ready / sent)
   - Stats row: Horas, Ingreso bruto, Retención, Neto estimado
   - Task list (left column): scrollable, each row shows project pill, description, hours, date. "Agregar tarea" button at bottom.
   - Right sidebar: Project donut chart (hours by project), Monthly trend bar chart, Seguridad social breakdown (IBC, salud, pensión, ARL, planilla total), Planilla upload dropzone, "Marcar como listo" button
   - If income > SMLMV, show warning banner about uploading planilla

3. **Add/Edit Task modal** — Fields: fecha, proyecto (dropdown from projects table), descripción, horas. Save inserts into tasks table with source='manual'.

4. **Excel Upload screen** — Drag-and-drop or file picker for the Excel file. Shows a preview table of parsed tasks before confirming import. Select which month sheet to import. On confirm, bulk inserts into tasks with source='excel_upload'.

5. **Cuenta de Cobro preview** — Shows the generated invoice as it will look in the PDF. Partner can review before marking ready. Shows invoice number, dates, amount in words, bank details. "Descargar PDF" button.

6. **Profile / Settings** — Partner can edit: hourly_rate, bank details, connect email (OAuth flow for Gmail or Outlook/Hotmail), connect Telegram (shows a link/code to message the bot), view their invoice_counter.

7. **Admin Dashboard** (only visible to is_admin users) — Shows a table of all partners for the current period: name, total_hours, task_count, status (in_progress/ready/sent), marked_ready_at. Does NOT show financial details (rates, amounts, aportes). Has a "Enviar todo" button that triggers the batch send n8n workflow. Can send nudge notifications to partners who haven't marked ready.

---

## Email sending architecture

Each partner connects their own email account via OAuth2:
- **Google (Gmail)**: OAuth2 with Gmail API send scope
- **Microsoft (Outlook/Hotmail)**: OAuth2 with Microsoft Graph mail.send scope

The OAuth flow happens in the React app (Profile/Settings screen). The tokens are stored in the `oauth_tokens` table (encrypted, partner-scoped via RLS).

When the batch send is triggered:
1. n8n reads each partner's OAuth token from Supabase
2. For each partner, it uses their token to send the cuenta de cobro email FROM their email address TO the PM's email (stored in settings.pm_email)
3. The email has the PDF attached and includes the partner's bank details
4. If a partner's token is expired, n8n uses the refresh_token to get a new one
5. If a partner hasn't connected email, the system falls back to sending from a centralized system email (if configured) and notifies the partner to forward manually

---

## Telegram bot architecture

A Telegram bot running via n8n webhook:

### Receiving tasks
Partner sends a message like: `3h FacturasApp: Fixed login validation bug`
The bot parses: hours=3, project=FacturasApp, description="Fixed login validation bug", date=today
Inserts into tasks with source='telegram'.

If the message can't be parsed, the bot asks for clarification.

### Sending notifications
The bot sends messages to partners via their `telegram_chat_id`:
- **Month-end reminder** (triggered 1-2 days after month ends): "El mes de abril terminó. Recuerda completar tus tareas en la app."
- **Nudge pending** (triggered by admin): "Todavía no has marcado tu período como listo. Los demás están esperando."
- **Invoice ready**: "Tu cuenta de cobro #20 está lista. Aquí está el PDF: [attachment]. Puedes reenviarlo a [PM name] por WhatsApp."
- **Social security reminder**: "Tu ingreso este mes supera 1 SMLMV. Recuerda subir tu planilla de seguridad social."

### Linking accounts
When a partner first messages the bot, it should ask for their email to link the Telegram chat_id to their partner record in Supabase. Use a verification code flow: partner enters their email in the app, gets a 6-digit code, sends it to the bot, bot verifies and stores the chat_id.

---

## n8n workflows to build

### 1. Month-end reminder
- **Trigger**: Cron, runs on the 1st of each month
- **Action**: For each active partner, check if they have a partner_period for the previous month. If not (or status='in_progress'), send a Telegram notification and/or email reminder.

### 2. Nudge pending partners
- **Trigger**: HTTP webhook (called from admin dashboard "Nudge" button)
- **Input**: period_year, period_month
- **Action**: Find all partners where partner_periods.status != 'ready' for that period. Send them a Telegram nudge.

### 3. Generate invoices (batch)
- **Trigger**: HTTP webhook (called from admin dashboard "Enviar todo" button)
- **Input**: period_year, period_month (or multiple months for combined invoices)
- **Action**: For each partner with status='ready':
  1. Call `next_invoice_number()` to get the sequential number
  2. Sum hours from tasks table for the period(s)
  3. Calculate total_amount = hours × hourly_rate
  4. Convert total_amount to Spanish words
  5. Generate PDF from the cuenta de cobro template
  6. Upload PDF to Supabase Storage
  7. Insert into invoices and invoice_periods tables
  8. Update partner_periods.status = 'sent'

### 4. Send invoices via email
- **Trigger**: Runs after workflow #3 for each generated invoice
- **Action**: For each partner:
  1. Read their OAuth token from Supabase
  2. Refresh token if expired
  3. Download the PDF from Supabase Storage
  4. Send email FROM partner's email TO pm_email with PDF attached
  5. Include planilla attachment if uploaded
  6. Update invoices.sent_at
  7. Log to audit_log
  8. Send Telegram message to partner: "Tu cuenta de cobro fue enviada. Aquí está el PDF para que lo reenvíes por WhatsApp si quieres."

### 5. Telegram bot webhook
- **Trigger**: Telegram webhook
- **Action**: Parse incoming messages. If it matches the task format (Xh Project: description), insert task. If it's a verification code, link the account. Otherwise, reply with usage instructions.

### 6. Refresh stats (cron)
- **Trigger**: Cron, runs every 6 hours
- **Action**: Call `refresh_monthly_stats()` to update the materialized view.

---

## File structure

```
cenet-timesheet/
├── CLAUDE.md                          # Claude Code project instructions
├── cenet_timesheet_migration.sql      # Full Supabase migration
├── package.json
├── vite.config.js
├── tailwind.config.js
├── .env                               # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── public/
├── src/
│   ├── main.jsx
│   ├── App.jsx                        # Router setup
│   ├── lib/
│   │   ├── supabase.js                # Supabase client init (schema: 'cenet')
│   │   ├── auth.jsx                   # Auth context provider
│   │   ├── excel-parser.js            # Parse uploaded Excel files
│   │   ├── number-to-words-es.js      # Number to Spanish words
│   │   └── format.js                  # COP formatting, date helpers
│   ├── hooks/
│   │   ├── useTasks.js                # CRUD for tasks
│   │   ├── useStats.js                # Fetch partner_monthly_stats
│   │   ├── usePartnerPeriod.js        # Period status management
│   │   ├── useInvoices.js             # Invoice generation/listing
│   │   └── useAdmin.js                # Admin-only: team readiness
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── AppShell.jsx           # Main layout wrapper
│   │   │   ├── Sidebar.jsx            # Navigation
│   │   │   └── CursorGlow.jsx         # Mouse-following warm glow effect
│   │   ├── dashboard/
│   │   │   ├── StatsRow.jsx           # 4 stat cards
│   │   │   ├── TaskList.jsx           # Task list with project pills
│   │   │   ├── ProjectDonut.jsx       # Hours by project chart
│   │   │   ├── MonthlyTrend.jsx       # Bar chart of hours/month
│   │   │   ├── AportesCard.jsx        # Seguridad social breakdown
│   │   │   ├── PlanillaUpload.jsx     # Dropzone for planilla PDF
│   │   │   └── ReadyButton.jsx        # "Marcar como listo"
│   │   ├── tasks/
│   │   │   ├── AddTaskModal.jsx
│   │   │   └── ExcelUpload.jsx        # Upload + preview + confirm
│   │   ├── invoice/
│   │   │   └── InvoicePreview.jsx     # Cuenta de cobro preview
│   │   ├── profile/
│   │   │   ├── ProfileForm.jsx        # Edit rate, bank details
│   │   │   ├── OAuthConnect.jsx       # Connect Gmail/Outlook
│   │   │   └── TelegramLink.jsx       # Link Telegram account
│   │   └── admin/
│   │       ├── TeamReadiness.jsx      # Table of all partners' status
│   │       ├── NudgeButton.jsx        # Send reminders to pending
│   │       └── BatchSendButton.jsx    # "Enviar todo" trigger
│   └── pages/
│       ├── LoginPage.jsx
│       ├── DashboardPage.jsx
│       ├── ExcelUploadPage.jsx
│       ├── InvoicePage.jsx
│       ├── ProfilePage.jsx
│       └── AdminPage.jsx
├── n8n-workflows/
│   ├── month-end-reminder.json
│   ├── nudge-pending.json
│   ├── generate-invoices.json
│   ├── send-invoices.json
│   ├── telegram-bot.json
│   └── refresh-stats.json
└── docs/
    ├── excel-template-spec.md
    ├── cuenta-cobro-template.md
    └── aportes-calculation.md
```

---

## Development order

Build in this sequence:

### Phase 1: Foundation
1. Initialize Vite + React + Tailwind + shadcn/ui
2. Set up Supabase client and auth context
3. Run the SQL migration in Supabase
4. Build the login page
5. Build the AppShell layout with CursorGlow effect and sidebar navigation

### Phase 2: Core features
6. Build the dashboard page with stats row (reading from partner_monthly_stats)
7. Build the task list component with add/edit/delete
8. Build the Excel upload + parser
9. Build the project donut chart and monthly trend chart
10. Build the aportes/seguridad social card

### Phase 3: Invoice flow
11. Build the "Marcar como listo" flow (updates partner_periods)
12. Build the invoice preview screen
13. Build the PDF generation (number-to-words-es, template rendering)
14. Build the planilla upload dropzone

### Phase 4: Email & notifications
15. Build the OAuth connect flow (Gmail + Outlook)
16. Build the profile/settings page
17. Build the Telegram account linking flow

### Phase 5: Admin & automation
18. Build the admin dashboard (team readiness table)
19. Build the n8n month-end reminder workflow
20. Build the n8n batch invoice generation workflow
21. Build the n8n email sending workflow
22. Build the n8n Telegram bot webhook workflow
23. Build the nudge button → n8n webhook integration

### Phase 6: Polish
24. Staggered animations on all pages
25. Loading skeletons
26. Error handling and toast notifications
27. Mobile responsive layout
28. Dark mode (optional, but the warm palette adapts well)

---

## Important constraints and decisions

- **Privacy is non-negotiable.** No partner should ever see another partner's tasks, hours, rate, earnings, or aportes. RLS handles this at the database level. The admin dashboard only shows names, hour totals, and readiness status — never financial details.
- **All tables live in the `cenet` schema, NOT `public`.** The Supabase client is initialized with `db: { schema: 'cenet' }` so all queries automatically target the right schema. Do NOT use `.schema('cenet')` on individual queries — it's set globally. Auth operations (`supabase.auth.*`) are unaffected. RPC calls to functions like `get_my_monthly_stats()` must use `.schema('cenet').rpc('get_my_monthly_stats')`.
- **Invoice numbers are per-partner and sequential.** Partner A might be on invoice #20 while Partner B is on #7. The `next_invoice_number()` function handles this atomically.
- **Invoices can span multiple months.** If a partner combines January and February into one cuenta de cobro, the invoice_periods table links that invoice to both months.
- **The hourly rate is configurable per partner.** Even though everyone currently has the same rate, rates can change independently.
- **The Excel parser must handle Excel serial dates.** Dates in the Excel are stored as numbers like 46023, not as date strings. Convert using: `new Date((serialDate - 25569) * 86400 * 1000)`.
- **The "Marcar como listo" button should only be enabled** when the partner has at least one task logged for the period AND (if aportes are required) they've uploaded their planilla.
- **Notifications flow through both Telegram and email.** Telegram is primary (most partners use it). Email is fallback. The notifications table tracks delivery status for retry logic.
- **The cursor-following glow is a signature design element.** It uses a radial gradient in the page background that tracks mouse position. Color: `rgba(201,100,66,0.06)`. Keep it subtle.
- **All financial amounts are displayed in COP format:** `$1.740.000` (period as thousands separator, no decimals). Use `Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 })`.
- **Spanish is the app language.** All UI text, labels, error messages, and notifications in Spanish.

---

## Reference files in project root

- `cenet_timesheet_migration.sql` — Full Supabase schema (run first)
- `cenet_dashboard_final.jsx` — Visual mockup / design reference for the dashboard
- `plantillaHorasTrabajadas2026.xlsx` — The Excel template partners currently use (for parser reference)
- `Cuenta_Cobro_19_-_Alejandro_Cataño.docx` — Real cuenta de cobro example (for PDF template)
- `Copia_de_Pago_aportes.xlsx` — Financial calculations reference (retención, aportes, IBC)

---

Start by setting up the project foundation (Phase 1), then proceed phase by phase. Ask me before making architectural decisions that deviate from this spec.

---

## Future: Google & Microsoft OAuth login (post-Phase 6)

After all phases are complete, replace email+password login with OAuth social login:

- **Google OAuth**: Partners log in with personal Gmail. Requires a Google Cloud Console project (free, under Alejandro's personal account).
- **Microsoft OAuth**: Partners log in with personal Hotmail/Outlook. Requires an Azure app registration set to "personal Microsoft accounts only" (free, under Alejandro's personal account).

**Important constraints:**
- CENET SA is NOT involved in this project. No `@cenet.co` email integration. No Azure AD / Microsoft 365 admin access.
- Only personal emails (Gmail, Hotmail, Outlook.com).
- These same OAuth apps can later be extended with email-sending scopes so n8n can send invoices FROM partners' personal emails (Phase 4 email feature).
- This is NOT blocking any phase — email+password login works fine for ~10 users.
