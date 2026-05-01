-- ============================================================
-- CENET Timesheet & Invoice System — Supabase Migration
-- ============================================================
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- This creates all tables, enums, RLS policies, and seed data.
-- Uses the "cenet" schema to avoid conflicts with existing tables.
-- ============================================================

-- ============================================================
-- 0. CREATE SCHEMA
-- ============================================================

CREATE SCHEMA IF NOT EXISTS cenet;
SET search_path TO cenet, public;

-- Grant access to Supabase roles so RLS and API work
GRANT USAGE ON SCHEMA cenet TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA cenet TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA cenet
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA cenet
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA cenet
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

-- Expose the schema via the Supabase API (PostgREST)
-- This tells PostgREST to include "cenet" in the exposed schemas.
-- NOTE: On self-hosted, you may also need to update your
-- PGRST_DB_SCHEMAS env var in docker-compose.yml to include "cenet":
--   PGRST_DB_SCHEMAS: "public,cenet"
-- Then restart the PostgREST container.

-- ============================================================
-- 1. CUSTOM TYPES (ENUMS)
-- ============================================================

CREATE TYPE task_source AS ENUM ('manual', 'excel_upload', 'telegram');

CREATE TYPE period_status AS ENUM ('in_progress', 'ready', 'sent');

CREATE TYPE attachment_type AS ENUM (
  'planilla_seguridad_social',
  'timesheet_excel',
  'other'
);

CREATE TYPE oauth_provider AS ENUM ('google', 'microsoft');

CREATE TYPE notification_type AS ENUM (
  'month_end_reminder',      -- "Hey, the month ended — log your tasks"
  'nudge_pending',           -- "You haven't marked ready yet"
  'invoice_ready',           -- "Your cuenta de cobro is generated"
  'batch_sent',              -- "All invoices were sent"
  'social_security_reminder' -- "You need to upload your planilla"
);

CREATE TYPE notification_channel AS ENUM ('email', 'telegram');

CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');

CREATE TYPE audit_action AS ENUM (
  'task_created',
  'task_updated',
  'task_deleted',
  'excel_uploaded',
  'invoice_generated',
  'invoice_sent',
  'rate_changed',
  'period_marked_ready',
  'period_sent',
  'attachment_uploaded',
  'oauth_connected',
  'oauth_revoked'
);

-- ============================================================
-- 2. TABLES
-- ============================================================

-- ----- 2.1 PARTNERS -----
-- Each partner = one Supabase Auth user.
-- The id here IS the auth.users.id (uuid).
CREATE TABLE partners (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT        NOT NULL,
  cc_number     TEXT        NOT NULL,  -- Cédula de ciudadanía
  cc_issued_in  TEXT,                  -- e.g. "Santa Rosa de Cabal"
  email         TEXT        NOT NULL UNIQUE,
  telegram_chat_id BIGINT,            -- Telegram chat ID for bot notifications
  hourly_rate   NUMERIC(12,2) NOT NULL DEFAULT 0,
  bank_name     TEXT,                  -- e.g. "Nubank"
  bank_account_type TEXT,             -- e.g. "Cuenta de ahorros"
  bank_account_number TEXT,           -- e.g. "93261089"
  invoice_counter INT       NOT NULL DEFAULT 0,  -- next invoice = counter + 1
  is_admin      BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE partners IS 'Each CENET partner/contractor. PK = Supabase auth user id.';
COMMENT ON COLUMN partners.invoice_counter IS 'Last used invoice number. Next invoice = counter + 1.';
COMMENT ON COLUMN partners.is_admin IS 'Admin can see the readiness dashboard and trigger batch sends.';

-- ----- 2.2 PROJECTS -----
CREATE TABLE projects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT    NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE projects IS 'CENET project catalog. Shared across all partners.';

-- ----- 2.3 TASKS -----
CREATE TABLE tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id       UUID        NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  project_id       UUID        REFERENCES projects(id) ON DELETE SET NULL,
  task_description  TEXT       NOT NULL,
  task_date        DATE        NOT NULL,
  day_of_week      TEXT,       -- "lunes", "martes", etc. (informational)
  week_number      INT,        -- 1-5, matches Excel "semana N"
  hours            NUMERIC(5,2) NOT NULL DEFAULT 0,
  source           task_source NOT NULL DEFAULT 'manual',
  period_year      INT         NOT NULL,
  period_month     INT         NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_partner_period ON tasks(partner_id, period_year, period_month);
CREATE INDEX idx_tasks_date ON tasks(task_date);

COMMENT ON TABLE tasks IS 'Individual task entries. One row per task per day.';

-- ----- 2.4 PARTNER PERIODS -----
-- Tracks each partner's readiness status for a given month.
CREATE TABLE partner_periods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID          NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  period_year     INT           NOT NULL,
  period_month    INT           NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  status          period_status NOT NULL DEFAULT 'in_progress',
  marked_ready_at TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(partner_id, period_year, period_month)
);

CREATE INDEX idx_partner_periods_status ON partner_periods(period_year, period_month, status);

COMMENT ON TABLE partner_periods IS 'Tracks whether a partner has finished logging tasks for a month and is ready to send.';

-- ----- 2.5 PARTNER PERIOD ATTACHMENTS -----
CREATE TABLE partner_period_attachments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_period_id   UUID            NOT NULL REFERENCES partner_periods(id) ON DELETE CASCADE,
  attachment_type     attachment_type  NOT NULL,
  file_url            TEXT            NOT NULL,  -- Supabase Storage URL
  file_name           TEXT            NOT NULL,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachments_period ON partner_period_attachments(partner_period_id);

COMMENT ON TABLE partner_period_attachments IS 'Planilla de seguridad social, exported Excel timesheets, and other docs attached to a period.';

-- ----- 2.6 INVOICES -----
CREATE TABLE invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        UUID        NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  invoice_number    INT         NOT NULL,  -- Sequential per partner
  period_start_date DATE        NOT NULL,
  period_end_date   DATE        NOT NULL,
  total_hours       NUMERIC(7,2) NOT NULL,
  hourly_rate       NUMERIC(12,2) NOT NULL,  -- Snapshot at generation time
  total_amount      NUMERIC(14,2) NOT NULL,
  total_amount_words TEXT,                    -- "Un millón setecientos..."
  pdf_url           TEXT,                     -- Supabase Storage URL
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(partner_id, invoice_number)
);

CREATE INDEX idx_invoices_partner ON invoices(partner_id);

COMMENT ON COLUMN invoices.hourly_rate IS 'Snapshot of rate at generation time. Does not change if partner updates their rate later.';
COMMENT ON COLUMN invoices.total_amount_words IS 'Spanish text representation of total_amount for the cuenta de cobro document.';

-- ----- 2.7 INVOICE PERIODS -----
-- Links one invoice to one or more months (for combined invoices).
CREATE TABLE invoice_periods (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  period_year  INT  NOT NULL,
  period_month INT  NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  UNIQUE(invoice_id, period_year, period_month)
);

CREATE INDEX idx_invoice_periods_invoice ON invoice_periods(invoice_id);

COMMENT ON TABLE invoice_periods IS 'Allows one invoice to cover multiple months (e.g. Jan+Feb combined).';

-- ----- 2.8 OAUTH TOKENS -----
CREATE TABLE oauth_tokens (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id       UUID           NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  provider         oauth_provider NOT NULL,
  email_address    TEXT           NOT NULL,  -- The actual email they authorized
  access_token     TEXT           NOT NULL,
  refresh_token    TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE(partner_id, provider, email_address)
);

COMMENT ON TABLE oauth_tokens IS 'OAuth2 tokens for sending emails from each partner''s own account (Gmail or Outlook/Hotmail).';
COMMENT ON COLUMN oauth_tokens.email_address IS 'The email address authorized. Could be work (partner@cenet.com) or personal (partner@gmail.com).';

-- ----- 2.9 AUDIT LOG -----
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  UUID         NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  action      audit_action NOT NULL,
  details     JSONB,        -- Flexible payload for context
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_partner ON audit_log(partner_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

COMMENT ON TABLE audit_log IS 'Internal accountability log. Each partner sees only their own entries.';

-- ----- 2.10 NOTIFICATIONS -----
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  UUID                NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  type        notification_type   NOT NULL,
  channel     notification_channel NOT NULL,
  status      notification_status NOT NULL DEFAULT 'pending',
  payload     JSONB,              -- Message content, metadata
  sent_at     TIMESTAMPTZ,
  error       TEXT,               -- Error message if failed
  created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_partner ON notifications(partner_id);
CREATE INDEX idx_notifications_status ON notifications(status) WHERE status = 'pending';

COMMENT ON TABLE notifications IS 'Tracks all notifications sent via email or Telegram. Used for retry logic and delivery tracking.';

-- ----- 2.11 SETTINGS -----
CREATE TABLE settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT  NOT NULL UNIQUE,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE settings IS 'Global system configuration. Key-value store.';

-- ============================================================
-- 3. AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_partner_periods_updated_at
  BEFORE UPDATE ON partner_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_oauth_tokens_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE partners                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_periods           ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_period_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_periods           ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens              ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings                  ENABLE ROW LEVEL SECURITY;

-- Helper function: is the current user an admin?
CREATE OR REPLACE FUNCTION cenet.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM cenet.partners WHERE id = auth.uid()),
    FALSE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ----- PARTNERS -----
-- Each partner can read/update their own row.
-- Admins can read all partners (for the readiness dashboard).
CREATE POLICY partners_select ON partners
  FOR SELECT USING (id = auth.uid() OR is_admin());

CREATE POLICY partners_update ON partners
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ----- PROJECTS -----
-- Everyone can read projects (shared catalog).
-- Only admins can insert/update/delete.
CREATE POLICY projects_select ON projects
  FOR SELECT USING (TRUE);

CREATE POLICY projects_admin_insert ON projects
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY projects_admin_update ON projects
  FOR UPDATE USING (is_admin());

CREATE POLICY projects_admin_delete ON projects
  FOR DELETE USING (is_admin());

-- ----- TASKS -----
-- Each partner sees only their own tasks.
-- Admins can read all (for reporting if needed).
CREATE POLICY tasks_select ON tasks
  FOR SELECT USING (partner_id = auth.uid() OR is_admin());

CREATE POLICY tasks_insert ON tasks
  FOR INSERT WITH CHECK (partner_id = auth.uid());

CREATE POLICY tasks_update ON tasks
  FOR UPDATE USING (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

CREATE POLICY tasks_delete ON tasks
  FOR DELETE USING (partner_id = auth.uid());

-- ----- PARTNER PERIODS -----
-- Each partner sees their own period status.
-- Admins can see all (readiness dashboard).
CREATE POLICY partner_periods_select ON partner_periods
  FOR SELECT USING (partner_id = auth.uid() OR is_admin());

CREATE POLICY partner_periods_insert ON partner_periods
  FOR INSERT WITH CHECK (partner_id = auth.uid());

CREATE POLICY partner_periods_update ON partner_periods
  FOR UPDATE USING (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

-- ----- PARTNER PERIOD ATTACHMENTS -----
-- Access through parent partner_period ownership.
CREATE POLICY attachments_select ON partner_period_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM partner_periods pp
      WHERE pp.id = partner_period_id
        AND (pp.partner_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY attachments_insert ON partner_period_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM partner_periods pp
      WHERE pp.id = partner_period_id
        AND pp.partner_id = auth.uid()
    )
  );

CREATE POLICY attachments_delete ON partner_period_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM partner_periods pp
      WHERE pp.id = partner_period_id
        AND pp.partner_id = auth.uid()
    )
  );

-- ----- INVOICES -----
CREATE POLICY invoices_select ON invoices
  FOR SELECT USING (partner_id = auth.uid() OR is_admin());

CREATE POLICY invoices_insert ON invoices
  FOR INSERT WITH CHECK (partner_id = auth.uid() OR is_admin());

-- ----- INVOICE PERIODS -----
CREATE POLICY invoice_periods_select ON invoice_periods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_id
        AND (i.partner_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY invoice_periods_insert ON invoice_periods
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_id
        AND (i.partner_id = auth.uid() OR is_admin())
    )
  );

-- ----- OAUTH TOKENS -----
-- Strictly private. Only the token owner can see/manage.
CREATE POLICY oauth_select ON oauth_tokens
  FOR SELECT USING (partner_id = auth.uid());

CREATE POLICY oauth_insert ON oauth_tokens
  FOR INSERT WITH CHECK (partner_id = auth.uid());

CREATE POLICY oauth_update ON oauth_tokens
  FOR UPDATE USING (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

CREATE POLICY oauth_delete ON oauth_tokens
  FOR DELETE USING (partner_id = auth.uid());

-- ----- AUDIT LOG -----
-- Each partner sees only their own audit trail.
-- Admins can see all.
CREATE POLICY audit_select ON audit_log
  FOR SELECT USING (partner_id = auth.uid() OR is_admin());

CREATE POLICY audit_insert ON audit_log
  FOR INSERT WITH CHECK (partner_id = auth.uid() OR is_admin());

-- ----- NOTIFICATIONS -----
-- Each partner sees their own notifications.
-- Admins can see all and insert (system sends on behalf).
CREATE POLICY notifications_select ON notifications
  FOR SELECT USING (partner_id = auth.uid() OR is_admin());

CREATE POLICY notifications_insert ON notifications
  FOR INSERT WITH CHECK (is_admin() OR partner_id = auth.uid());

CREATE POLICY notifications_update ON notifications
  FOR UPDATE USING (is_admin());

-- ----- SETTINGS -----
-- Everyone can read settings. Only admins can modify.
CREATE POLICY settings_select ON settings
  FOR SELECT USING (TRUE);

CREATE POLICY settings_admin_modify ON settings
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- 5. HELPER FUNCTIONS
-- ============================================================

-- Calculate total hours for a partner in a given period
CREATE OR REPLACE FUNCTION get_partner_period_hours(
  p_partner_id UUID,
  p_year INT,
  p_month INT
)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(hours), 0)
  FROM tasks
  WHERE partner_id = p_partner_id
    AND period_year = p_year
    AND period_month = p_month;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Calculate total amount for a partner in a given period
CREATE OR REPLACE FUNCTION get_partner_period_amount(
  p_partner_id UUID,
  p_year INT,
  p_month INT
)
RETURNS NUMERIC AS $$
  SELECT get_partner_period_hours(p_partner_id, p_year, p_month)
       * (SELECT hourly_rate FROM partners WHERE id = p_partner_id);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if a partner exceeds the SMLMV threshold (needs planilla)
CREATE OR REPLACE FUNCTION needs_social_security(
  p_partner_id UUID,
  p_year INT,
  p_month INT
)
RETURNS BOOLEAN AS $$
  SELECT get_partner_period_amount(p_partner_id, p_year, p_month)
       >= COALESCE(
            (SELECT (value->>'amount')::NUMERIC FROM settings WHERE key = 'smlmv'),
            0
          );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get next invoice number for a partner (and increment counter)
CREATE OR REPLACE FUNCTION next_invoice_number(p_partner_id UUID)
RETURNS INT AS $$
DECLARE
  next_num INT;
BEGIN
  UPDATE partners
  SET invoice_counter = invoice_counter + 1
  WHERE id = p_partner_id
  RETURNING invoice_counter INTO next_num;

  RETURN next_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. SEED DATA
-- ============================================================

-- Projects (from the Excel "proyectos" sheet)
INSERT INTO projects (name) VALUES
  ('MiPlataforma'),
  ('MiNomina'),
  ('MisFacturas'),
  ('MiPlanilla'),
  ('FacturasApp'),
  ('Propensar');

-- Global settings
INSERT INTO settings (key, value) VALUES
  ('company_name',    '"COMERCIO ELECTRÓNICO EN INTERNET CENET SA"'),
  ('company_nit',     '"830057860"'),
  ('smlmv',           '{"amount": 1423500, "year": 2026, "currency": "COP"}'),
  ('aportes_rates',   '{"salud": 0.125, "pension": 0.16, "riesgos_laborales": 0.00522, "total": 0.29022}'),
  ('retencion_rate',  '{"rate": 0.11, "description": "Retención en la fuente aplicada por la empresa"}'),
  ('deadline_days',   '3'),
  ('pm_email',        '""'),
  ('batch_send_mode', '"manual"')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 7. STATS — MATERIALIZED VIEW + ACCESS FUNCTIONS
-- ============================================================
-- Pre-calculates all financial data per partner per month.
-- Includes: gross income, retención, IBC, aportes breakdown,
-- planilla total, and take-home pay.
-- Refresh after bulk task changes or at month-end via n8n.

CREATE MATERIALIZED VIEW partner_monthly_stats AS
WITH
  config AS (
    SELECT
      COALESCE((SELECT (value->>'amount')::NUMERIC FROM settings WHERE key = 'smlmv'), 0)             AS smlmv,
      COALESCE((SELECT (value->>'total')::NUMERIC  FROM settings WHERE key = 'aportes_rates'), 0.29022) AS aportes_total_rate,
      COALESCE((SELECT (value->>'salud')::NUMERIC  FROM settings WHERE key = 'aportes_rates'), 0.125)   AS aportes_salud_rate,
      COALESCE((SELECT (value->>'pension')::NUMERIC FROM settings WHERE key = 'aportes_rates'), 0.16)   AS aportes_pension_rate,
      COALESCE((SELECT (value->>'riesgos_laborales')::NUMERIC FROM settings WHERE key = 'aportes_rates'), 0.00522) AS aportes_arl_rate,
      COALESCE((SELECT (value->>'rate')::NUMERIC   FROM settings WHERE key = 'retencion_rate'), 0)     AS retencion_rate
  ),
  task_agg AS (
    SELECT
      t.partner_id,
      t.period_year,
      t.period_month,
      COUNT(*)                        AS task_count,
      COALESCE(SUM(t.hours), 0)       AS total_hours,
      COUNT(DISTINCT t.task_date)     AS days_worked,
      MIN(t.task_date)                AS first_task_date,
      MAX(t.task_date)                AS last_task_date
    FROM tasks t
    GROUP BY t.partner_id, t.period_year, t.period_month
  ),
  project_hours AS (
    SELECT
      t.partner_id,
      t.period_year,
      t.period_month,
      COALESCE(p.name, 'Sin proyecto') AS project_name,
      round(SUM(t.hours), 2) AS project_total
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    GROUP BY t.partner_id, t.period_year, t.period_month, COALESCE(p.name, 'Sin proyecto')
  ),
  project_breakdown AS (
    SELECT
      partner_id,
      period_year,
      period_month,
      jsonb_object_agg(project_name, project_total) AS hours_by_project
    FROM project_hours
    GROUP BY partner_id, period_year, period_month
  )
SELECT
  ta.partner_id,
  ta.period_year,
  ta.period_month,
  -- Task stats
  ta.task_count,
  ta.total_hours,
  ta.days_worked,
  ta.first_task_date,
  ta.last_task_date,
  COALESCE(pb.hours_by_project, '{}'::JSONB) AS hours_by_project,
  CASE WHEN ta.days_worked > 0
    THEN ROUND(ta.total_hours / ta.days_worked, 2) ELSE 0
  END AS avg_hours_per_day,
  -- Financial
  pr.hourly_rate,
  ROUND(ta.total_hours * pr.hourly_rate, 2) AS gross_income,
  ROUND(ta.total_hours * pr.hourly_rate * c.retencion_rate, 2) AS retencion_amount,
  ROUND(ta.total_hours * pr.hourly_rate * (1 - c.retencion_rate), 2) AS net_after_retencion,
  -- IBC: 40% of gross, only if >= SMLMV
  CASE
    WHEN (ta.total_hours * pr.hourly_rate * 0.4) >= c.smlmv
      THEN ROUND(ta.total_hours * pr.hourly_rate * 0.4, 2)
    ELSE 0
  END AS ibc,
  (ta.total_hours * pr.hourly_rate * 0.4) >= c.smlmv AS aportes_required,
  -- Aportes breakdown
  CASE WHEN (ta.total_hours * pr.hourly_rate * 0.4) >= c.smlmv
    THEN ROUND(ta.total_hours * pr.hourly_rate * 0.4 * c.aportes_salud_rate, 2) ELSE 0
  END AS aportes_salud,
  CASE WHEN (ta.total_hours * pr.hourly_rate * 0.4) >= c.smlmv
    THEN ROUND(ta.total_hours * pr.hourly_rate * 0.4 * c.aportes_pension_rate, 2) ELSE 0
  END AS aportes_pension,
  CASE WHEN (ta.total_hours * pr.hourly_rate * 0.4) >= c.smlmv
    THEN ROUND(ta.total_hours * pr.hourly_rate * 0.4 * c.aportes_arl_rate, 2) ELSE 0
  END AS aportes_arl,
  CASE WHEN (ta.total_hours * pr.hourly_rate * 0.4) >= c.smlmv
    THEN ROUND(ta.total_hours * pr.hourly_rate * 0.4 * c.aportes_total_rate, 2) ELSE 0
  END AS planilla_total,
  -- Take-home = net after retención - planilla
  ROUND(
    ta.total_hours * pr.hourly_rate * (1 - c.retencion_rate)
    - CASE WHEN (ta.total_hours * pr.hourly_rate * 0.4) >= c.smlmv
        THEN ta.total_hours * pr.hourly_rate * 0.4 * c.aportes_total_rate ELSE 0
      END,
    2
  ) AS take_home,
  -- Period status
  pp.status   AS period_status,
  pp.marked_ready_at,
  pp.sent_at
FROM task_agg ta
JOIN partners pr ON pr.id = ta.partner_id
LEFT JOIN project_breakdown pb
  ON  pb.partner_id  = ta.partner_id
  AND pb.period_year = ta.period_year
  AND pb.period_month = ta.period_month
LEFT JOIN partner_periods pp
  ON  pp.partner_id  = ta.partner_id
  AND pp.period_year = ta.period_year
  AND pp.period_month = ta.period_month
CROSS JOIN config c;

CREATE UNIQUE INDEX idx_partner_monthly_stats
  ON partner_monthly_stats(partner_id, period_year, period_month);

-- RLS isn't supported on materialized views, so we use
-- security-definer functions to enforce access control.

-- Partner sees only their own stats
CREATE OR REPLACE FUNCTION get_my_monthly_stats(
  p_year INT DEFAULT NULL,
  p_month INT DEFAULT NULL
)
RETURNS SETOF partner_monthly_stats AS $$
  SELECT *
  FROM partner_monthly_stats
  WHERE partner_id = auth.uid()
    AND (p_year  IS NULL OR period_year  = p_year)
    AND (p_month IS NULL OR period_month = p_month)
  ORDER BY period_year DESC, period_month DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Admin sees all partners (readiness dashboard — no financial details)
CREATE OR REPLACE FUNCTION get_team_readiness(p_year INT, p_month INT)
RETURNS TABLE (
  partner_id     UUID,
  full_name      TEXT,
  total_hours    NUMERIC,
  task_count     BIGINT,
  period_status  period_status,
  marked_ready_at TIMESTAMPTZ
) AS $$
  SELECT
    s.partner_id, pr.full_name,
    s.total_hours, s.task_count,
    s.period_status, s.marked_ready_at
  FROM partner_monthly_stats s
  JOIN partners pr ON pr.id = s.partner_id
  WHERE s.period_year = p_year
    AND s.period_month = p_month
    AND is_admin();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Refresh function (call from n8n cron or after bulk operations)
CREATE OR REPLACE FUNCTION refresh_monthly_stats()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY partner_monthly_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. STORAGE BUCKETS (run via Supabase Dashboard or API)
-- ============================================================
-- These need to be created in the Supabase Dashboard under Storage:
--
-- Bucket: "invoices"
--   - Private bucket
--   - RLS: partner can read own files (path starts with their UUID)
--
-- Bucket: "attachments"
--   - Private bucket
--   - RLS: partner can read/write own files (path starts with their UUID)
--
-- File path convention:
--   invoices/{partner_id}/{year}-{month}/cuenta_cobro_{invoice_number}.pdf
--   attachments/{partner_id}/{year}-{month}/planilla.pdf
--   attachments/{partner_id}/{year}-{month}/timesheet.xlsx

-- ============================================================
-- DONE — IMPORTANT POST-MIGRATION STEP
-- ============================================================
-- For the Supabase API (PostgREST) to see the cenet schema,
-- you MUST update your docker-compose.yml:
--
--   Find the PostgREST/rest service and change:
--     PGRST_DB_SCHEMAS: "public"
--   To:
--     PGRST_DB_SCHEMAS: "public,cenet"
--
--   Then restart: docker compose restart rest
--
-- After that, your Supabase client can query cenet tables with:
--   supabase.schema('cenet').from('partners').select('*')
-- ============================================================

-- Reset search_path to default
RESET search_path;
