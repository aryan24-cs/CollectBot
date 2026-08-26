-- ══════════════════════════════════════════════════════════════════════════
-- COLLECTBOT — MASTER UNIFIED COMPLETE DATABASE SCHEMA
-- Includes Core SaaS, Super Admin, Multi-Business Employees, RBAC,
-- Sales CRM, Marketing, Enterprise Modules, Non-Recursive RLS, and Composite Indexes.
-- ══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ─────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────
-- 2. HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────

-- Auto-update updated_at timestamp function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Non-recursive employee business resolution function for RLS
CREATE OR REPLACE FUNCTION get_employee_business_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM employees WHERE user_id = p_user_id;
$$;

-- ─────────────────────────────────────────────────────────
-- 3. CORE SAAS & TENANT TABLES
-- ─────────────────────────────────────────────────────────

-- Businesses (Workspaces)
CREATE TABLE IF NOT EXISTS businesses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  logo_url              TEXT,
  email                 TEXT,
  phone                 TEXT,
  address               TEXT,
  city                  TEXT,
  state                 TEXT,
  pincode               TEXT,
  gstin                 TEXT,
  pan                   TEXT,
  bank_name             TEXT,
  account_number        TEXT,
  ifsc_code             TEXT,
  upi_id                TEXT,
  currency              TEXT DEFAULT 'INR',
  timezone              TEXT DEFAULT 'Asia/Kolkata',
  whatsapp_number       TEXT,
  invoice_prefix        TEXT DEFAULT 'INV',
  invoice_counter       INTEGER DEFAULT 1,
  default_payment_terms INTEGER DEFAULT 7,
  default_tax_rate      NUMERIC DEFAULT 0,
  default_notes         TEXT,
  default_terms         TEXT,
  invoice_template      TEXT DEFAULT 'modern',
  primary_color         TEXT DEFAULT 'blue',
  font_family           TEXT DEFAULT 'Inter',
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT NOT NULL,
  company_name    TEXT,
  address         TEXT,
  gstin           TEXT,
  payment_terms   INTEGER DEFAULT 7,
  notes           TEXT,
  tags            TEXT[] DEFAULT '{}',
  total_invoiced  NUMERIC DEFAULT 0,
  total_paid      NUMERIC DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID REFERENCES businesses(id) ON DELETE CASCADE,
  client_id         UUID REFERENCES clients(id) ON DELETE SET NULL,
  invoice_number    TEXT NOT NULL,
  status            TEXT DEFAULT 'draft' 
                    CHECK (status IN (
                      'draft','sent','viewed',
                      'paid','overdue','cancelled','partial'
                    )),
  issue_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date          DATE NOT NULL,
  subtotal          NUMERIC NOT NULL DEFAULT 0,
  tax_amount        NUMERIC DEFAULT 0,
  discount          NUMERIC DEFAULT 0,
  total             NUMERIC NOT NULL DEFAULT 0,
  amount_paid       NUMERIC DEFAULT 0,
  balance_due       NUMERIC NOT NULL DEFAULT 0,
  notes             TEXT,
  terms             TEXT,
  pdf_url           TEXT,
  receipt_url       TEXT,
  payment_link      TEXT,
  payment_link_id   TEXT,
  sent_at           TIMESTAMP WITH TIME ZONE,
  viewed_at         TIMESTAMP WITH TIME ZONE,
  paid_at           TIMESTAMP WITH TIME ZONE,
  reminder_paused   BOOLEAN DEFAULT FALSE,
  reminder_count    INTEGER DEFAULT 0,
  is_recurring      BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, invoice_number)
);

-- Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    NUMERIC NOT NULL DEFAULT 1,
  rate        NUMERIC NOT NULL DEFAULT 0,
  tax_rate    NUMERIC DEFAULT 0,
  tax_amount  NUMERIC DEFAULT 0,
  amount      NUMERIC NOT NULL DEFAULT 0,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id          UUID REFERENCES invoices(id) ON DELETE CASCADE,
  client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
  amount              NUMERIC NOT NULL,
  payment_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode        TEXT NOT NULL DEFAULT 'upi'
                      CHECK (payment_mode IN ('upi','bank_transfer','cash','cheque','card','razorpay','other')),
  reference_number    TEXT,
  notes               TEXT,
  razorpay_payment_id TEXT,
  razorpay_order_id   TEXT,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reminder Logs
CREATE TABLE IF NOT EXISTS reminder_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id      UUID REFERENCES invoices(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL CHECK (channel IN ('whatsapp','email','sms')),
  message_type    TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('sent','failed','delivered','read')),
  phone_or_email  TEXT NOT NULL,
  message_content TEXT,
  sent_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_message   TEXT
);

-- Reminder Settings
CREATE TABLE IF NOT EXISTS reminder_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  whatsapp_enabled        BOOLEAN DEFAULT TRUE,
  email_enabled           BOOLEAN DEFAULT TRUE,
  sms_enabled             BOOLEAN DEFAULT FALSE,
  auto_remind_on_due_date BOOLEAN DEFAULT TRUE,
  auto_remind_overdue     BOOLEAN DEFAULT TRUE,
  overdue_frequency_days  INTEGER DEFAULT 3,
  max_reminders           INTEGER DEFAULT 5,
  send_time               TEXT DEFAULT '10:00',
  custom_message_template TEXT,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- 4. SUPER ADMIN TABLES
-- ─────────────────────────────────────────────────────────

-- Admin Users
CREATE TABLE IF NOT EXISTS admin_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'support')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SaaS Plans
CREATE TABLE IF NOT EXISTS plans (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        TEXT NOT NULL UNIQUE,
  display_name                TEXT NOT NULL,
  description                 TEXT,
  price_monthly               NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly                NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_invoices_per_month      INTEGER NOT NULL DEFAULT 10,
  max_clients                 INTEGER NOT NULL DEFAULT 5,
  max_team_members            INTEGER NOT NULL DEFAULT 1,
  feature_whatsapp            BOOLEAN NOT NULL DEFAULT FALSE,
  feature_email               BOOLEAN NOT NULL DEFAULT TRUE,
  feature_sms                 BOOLEAN NOT NULL DEFAULT FALSE,
  feature_payment_links       BOOLEAN NOT NULL DEFAULT TRUE,
  feature_recurring           BOOLEAN NOT NULL DEFAULT FALSE,
  feature_pdf_invoice         BOOLEAN NOT NULL DEFAULT TRUE,
  feature_custom_branding     BOOLEAN NOT NULL DEFAULT FALSE,
  feature_remove_watermark    BOOLEAN NOT NULL DEFAULT FALSE,
  feature_reminder_auto       BOOLEAN NOT NULL DEFAULT FALSE,
  feature_reminder_custom     BOOLEAN NOT NULL DEFAULT FALSE,
  feature_analytics_basic     BOOLEAN NOT NULL DEFAULT TRUE,
  feature_analytics_advanced  BOOLEAN NOT NULL DEFAULT FALSE,
  feature_bulk_invoice        BOOLEAN NOT NULL DEFAULT FALSE,
  feature_csv_import          BOOLEAN NOT NULL DEFAULT FALSE,
  feature_api_access          BOOLEAN NOT NULL DEFAULT FALSE,
  feature_white_label         BOOLEAN NOT NULL DEFAULT FALSE,
  feature_team_access         BOOLEAN NOT NULL DEFAULT FALSE,
  feature_client_portal       BOOLEAN NOT NULL DEFAULT FALSE,
  feature_tally_export        BOOLEAN NOT NULL DEFAULT FALSE,
  feature_priority_support    BOOLEAN NOT NULL DEFAULT FALSE,
  feature_dedicated_manager   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order                  INTEGER NOT NULL DEFAULT 0,
  created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  plan_name             TEXT NOT NULL DEFAULT 'free' REFERENCES plans(name),
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'paused')),
  billing_cycle         TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime')),
  current_period_start  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_period_end    TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end  BOOLEAN NOT NULL DEFAULT FALSE,
  razorpay_sub_id       TEXT,
  razorpay_customer_id  TEXT,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature Overrides
CREATE TABLE IF NOT EXISTS business_feature_overrides (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id                   UUID REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  is_full_access                BOOLEAN NOT NULL DEFAULT FALSE,
  is_blocked                    BOOLEAN NOT NULL DEFAULT FALSE,
  block_reason                  TEXT,
  override_max_invoices         INTEGER,
  override_max_clients          INTEGER,
  override_max_team_members     INTEGER,
  override_whatsapp             BOOLEAN,
  override_email                BOOLEAN,
  override_sms                  BOOLEAN,
  override_payment_links        BOOLEAN,
  override_recurring            BOOLEAN,
  override_pdf_invoice          BOOLEAN,
  override_custom_branding      BOOLEAN,
  override_remove_watermark     BOOLEAN,
  override_reminder_auto        BOOLEAN,
  override_reminder_custom      BOOLEAN,
  override_analytics_basic      BOOLEAN,
  override_analytics_advanced   BOOLEAN,
  override_bulk_invoice         BOOLEAN,
  override_csv_import           BOOLEAN,
  override_api_access           BOOLEAN,
  override_white_label          BOOLEAN,
  override_team_access          BOOLEAN,
  override_client_portal        BOOLEAN,
  override_tally_export         BOOLEAN,
  override_priority_support     BOOLEAN,
  override_dedicated_manager    BOOLEAN,
  notes                         TEXT,
  created_by                    UUID REFERENCES admin_users(id),
  created_at                    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at                    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin Activity Logs
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  admin_email     TEXT NOT NULL,
  action          TEXT NOT NULL,
  target_type     TEXT NOT NULL,
  target_id       TEXT,
  target_name     TEXT,
  changes         JSONB,
  ip_address      TEXT,
  user_agent      TEXT,
  description     TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Metrics
CREATE TABLE IF NOT EXISTS system_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date            DATE NOT NULL UNIQUE,
  total_users     INTEGER NOT NULL DEFAULT 0,
  active_users    INTEGER NOT NULL DEFAULT 0,
  new_signups     INTEGER NOT NULL DEFAULT 0,
  total_invoices  INTEGER NOT NULL DEFAULT 0,
  invoices_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_payments  INTEGER NOT NULL DEFAULT 0,
  payments_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  mrr             NUMERIC(15,2) NOT NULL DEFAULT 0,
  arr             NUMERIC(15,2) NOT NULL DEFAULT 0,
  free_users      INTEGER NOT NULL DEFAULT 0,
  paid_users      INTEGER NOT NULL DEFAULT 0,
  reminders_sent  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- 5. ORGANIZATION & MULTI-EMPLOYEE WORKSPACE TABLES
-- ─────────────────────────────────────────────────────────

-- Branches
CREATE TABLE IF NOT EXISTS branches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  code          TEXT,
  address       TEXT,
  phone         TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom Roles
CREATE TABLE IF NOT EXISTS custom_roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       UUID REFERENCES custom_roles(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,
  action        TEXT NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, category, action)
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  employee_type   TEXT NOT NULL DEFAULT 'FINANCE' CHECK (employee_type IN ('FINANCE', 'SALES', 'MARKETING')),
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  custom_role_id  UUID REFERENCES custom_roles(id) ON DELETE SET NULL,
  designation     TEXT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  last_login      TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE,
  UNIQUE(business_id, email)
);

-- Employee Profiles
CREATE TABLE IF NOT EXISTS employee_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
  avatar_url    TEXT,
  skills        TEXT[] DEFAULT '{}',
  emergency_contact TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employee Direct Permissions
CREATE TABLE IF NOT EXISTS employee_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,
  action        TEXT NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, category, action)
);

-- Employee Login History
CREATE TABLE IF NOT EXISTS employee_login_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE,
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employee Activity Logs
CREATE TABLE IF NOT EXISTS employee_activity_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE,
  action        TEXT NOT NULL,
  details       JSONB DEFAULT '{}',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- 6. FINANCE & APPROVALS TABLES
-- ─────────────────────────────────────────────────────────

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  creator_id    UUID REFERENCES employees(id) ON DELETE SET NULL,
  category      TEXT NOT NULL,
  amount        NUMERIC NOT NULL DEFAULT 0,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  description   TEXT,
  status        TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
  receipt_url   TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approval Requests
CREATE TABLE IF NOT EXISTS approval_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  requester_id  UUID REFERENCES employees(id) ON DELETE CASCADE,
  approver_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
  entity_type   TEXT NOT NULL CHECK (entity_type IN ('invoice', 'expense', 'client_discount')),
  entity_id     UUID NOT NULL,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes         TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  assignee_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
  due_date      TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE,
  target_type   TEXT NOT NULL CHECK (target_type IN ('invoice', 'client', 'task', 'expense')),
  target_id     UUID NOT NULL,
  content       TEXT NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- 7. SALES CRM TABLES
-- ─────────────────────────────────────────────────────────

-- Sales Leads
CREATE TABLE IF NOT EXISTS sales_leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  assigned_to     UUID REFERENCES employees(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  company         TEXT,
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost')),
  source          TEXT,
  value           NUMERIC DEFAULT 0,
  confidence      INTEGER DEFAULT 50,
  expected_close  DATE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE
);

-- Sales Pipeline
CREATE TABLE IF NOT EXISTS sales_pipeline (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  stage_order   INTEGER NOT NULL DEFAULT 0,
  win_rate      INTEGER DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales Notes
CREATE TABLE IF NOT EXISTS sales_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES sales_leads(id) ON DELETE CASCADE,
  employee_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
  note          TEXT NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales Followups
CREATE TABLE IF NOT EXISTS sales_followups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES sales_leads(id) ON DELETE CASCADE,
  employee_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
  scheduled_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('call', 'meeting', 'email', 'demo')),
  notes         TEXT,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed')),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales Tasks
CREATE TABLE IF NOT EXISTS sales_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES sales_leads(id) ON DELETE CASCADE,
  employee_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  due_date      DATE,
  priority      TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status        TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales Targets
CREATE TABLE IF NOT EXISTS sales_targets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE,
  target_amount NUMERIC NOT NULL,
  achieved_amount NUMERIC DEFAULT 0,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- 8. MARKETING AUTOMATION TABLES
-- ─────────────────────────────────────────────────────────

-- Marketing Campaigns
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('whatsapp', 'email', 'sms')),
  subject         TEXT,
  content         TEXT NOT NULL,
  scheduled_at    TIMESTAMP WITH TIME ZONE,
  sent_at         TIMESTAMP WITH TIME ZONE,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled')),
  total_recipients INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count    INTEGER DEFAULT 0,
  clicked_count   INTEGER DEFAULT 0,
  converted_count INTEGER DEFAULT 0,
  revenue_generated NUMERIC DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketing Templates
CREATE TABLE IF NOT EXISTS marketing_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('whatsapp', 'email', 'sms')),
  category      TEXT,
  content       TEXT NOT NULL,
  variables     TEXT[] DEFAULT '{}',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketing Contacts
CREATE TABLE IF NOT EXISTS marketing_contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  tags          TEXT[] DEFAULT '{}',
  is_subscribed BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketing Segments
CREATE TABLE IF NOT EXISTS marketing_segments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  filter_rules  JSONB DEFAULT '{}',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketing Analytics
CREATE TABLE IF NOT EXISTS marketing_analytics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  campaign_id   UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  contact_id    UUID,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketing Forms (Lead capture)
CREATE TABLE IF NOT EXISTS marketing_forms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  fields        JSONB DEFAULT '[]',
  submissions   INTEGER DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketing Coupons
CREATE TABLE IF NOT EXISTS marketing_coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value  NUMERIC NOT NULL,
  min_order_value NUMERIC DEFAULT 0,
  max_uses        INTEGER,
  used_count      INTEGER DEFAULT 0,
  expires_at      TIMESTAMP WITH TIME ZONE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE,
  UNIQUE(business_id, code)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  type          TEXT DEFAULT 'info',
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- 9. ENTERPRISE MODULES
-- ─────────────────────────────────────────────────────────

-- Payment Gateways
CREATE TABLE IF NOT EXISTS payment_gateways (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL CHECK (provider IN ('razorpay', 'cashfree', 'stripe', 'paytm', 'phonepe')),
  key_id          TEXT NOT NULL,
  key_secret      TEXT NOT NULL,
  webhook_secret  TEXT,
  is_enabled      BOOLEAN DEFAULT TRUE,
  is_test_mode    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, provider)
);

-- Payment Webhooks (Idempotency & Audit)
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID REFERENCES businesses(id) ON DELETE CASCADE,
  gateway_provider  TEXT NOT NULL,
  event_type        TEXT NOT NULL,
  payload           JSONB NOT NULL,
  signature         TEXT,
  status            TEXT DEFAULT 'processed' CHECK (status IN ('processed', 'failed', 'ignored', 'retried')),
  processed_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_log         TEXT,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Receipts
CREATE TABLE IF NOT EXISTS payment_receipts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  payment_id      UUID REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id      UUID REFERENCES invoices(id) ON DELETE CASCADE,
  receipt_number  TEXT NOT NULL,
  pdf_url         TEXT,
  sent_at         TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, receipt_number)
);

-- Invoice Branding & Customization
CREATE TABLE IF NOT EXISTS invoice_branding (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  primary_color           TEXT DEFAULT '#1A1A1A',
  accent_color            TEXT DEFAULT '#E91E63',
  font_family             TEXT DEFAULT 'Inter',
  template_style          TEXT DEFAULT 'modern' CHECK (template_style IN ('classic', 'modern', 'minimal', 'corporate', 'premium')),
  show_logo               BOOLEAN DEFAULT TRUE,
  show_qr_code            BOOLEAN DEFAULT TRUE,
  show_stamp              BOOLEAN DEFAULT FALSE,
  stamp_url               TEXT,
  signature_url           TEXT,
  custom_watermark        TEXT,
  show_collectbot_badge   BOOLEAN DEFAULT TRUE,
  terms_text              TEXT,
  notes_text              TEXT,
  custom_css              TEXT,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Export Jobs
CREATE TABLE IF NOT EXISTS export_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  format        TEXT NOT NULL CHECK (format IN ('tally_xml', 'tally_csv', 'quickbooks_csv', 'excel_csv', 'custom_csv')),
  entity_type   TEXT NOT NULL CHECK (entity_type IN ('invoices', 'clients', 'payments', 'expenses', 'sales_register', 'ledger')),
  filters       JSONB DEFAULT '{}',
  file_url      TEXT,
  item_count    INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by    UUID
);

-- Client Portal Events
CREATE TABLE IF NOT EXISTS client_portal_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id    UUID REFERENCES invoices(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL CHECK (event_type IN ('viewed', 'download_pdf', 'pay_click', 'payment_attempt', 'query_raised')),
  ip_address    TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client Portal Queries
CREATE TABLE IF NOT EXISTS client_portal_queries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id    UUID REFERENCES invoices(id) ON DELETE CASCADE,
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  message       TEXT NOT NULL,
  attachment_url TEXT,
  status        TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_queries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "businesses_RLS" ON businesses;
DROP POLICY IF EXISTS "clients_RLS" ON clients;
DROP POLICY IF EXISTS "invoices_RLS" ON invoices;
DROP POLICY IF EXISTS "payments_RLS" ON payments;
DROP POLICY IF EXISTS "reminder_logs_RLS" ON reminder_logs;
DROP POLICY IF EXISTS "reminder_settings_RLS" ON reminder_settings;
DROP POLICY IF EXISTS "activity_logs_RLS" ON activity_logs;
DROP POLICY IF EXISTS "employees_RLS" ON employees;
DROP POLICY IF EXISTS "expenses_RLS" ON expenses;
DROP POLICY IF EXISTS "approval_requests_RLS" ON approval_requests;
DROP POLICY IF EXISTS "tasks_RLS" ON tasks;
DROP POLICY IF EXISTS "comments_RLS" ON comments;
DROP POLICY IF EXISTS "sales_leads_RLS" ON sales_leads;
DROP POLICY IF EXISTS "sales_tasks_RLS" ON sales_tasks;
DROP POLICY IF EXISTS "sales_notes_RLS" ON sales_notes;
DROP POLICY IF EXISTS "sales_followups_RLS" ON sales_followups;
DROP POLICY IF EXISTS "marketing_campaigns_RLS" ON marketing_campaigns;
DROP POLICY IF EXISTS "marketing_coupons_RLS" ON marketing_coupons;
DROP POLICY IF EXISTS "notifications_RLS" ON notifications;
DROP POLICY IF EXISTS "payment_gateways_RLS" ON payment_gateways;
DROP POLICY IF EXISTS "invoice_branding_RLS" ON invoice_branding;
DROP POLICY IF EXISTS "export_jobs_RLS" ON export_jobs;
DROP POLICY IF EXISTS "client_portal_queries_RLS" ON client_portal_queries;

-- Businesses Policy
CREATE POLICY "businesses_RLS" ON businesses FOR ALL USING (
  user_id = auth.uid()
  OR
  id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- Employees Policy (Non-recursive)
CREATE POLICY "employees_RLS" ON employees FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- Clients Policy
CREATE POLICY "clients_RLS" ON clients FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- Invoices Policy
CREATE POLICY "invoices_RLS" ON invoices FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- Payments Policy
CREATE POLICY "payments_RLS" ON payments FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- Reminder Settings Policy
CREATE POLICY "reminder_settings_RLS" ON reminder_settings FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
);

-- Reminder Logs Policy
CREATE POLICY "reminder_logs_RLS" ON reminder_logs FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- Activity Logs Policy
CREATE POLICY "activity_logs_RLS" ON activity_logs FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- Expenses Policy
CREATE POLICY "expenses_RLS" ON expenses FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- Approval Requests Policy
CREATE POLICY "approval_requests_RLS" ON approval_requests FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- Tasks Policy
CREATE POLICY "tasks_RLS" ON tasks FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- Comments Policy
CREATE POLICY "comments_RLS" ON comments FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- Sales Leads Policy
CREATE POLICY "sales_leads_RLS" ON sales_leads FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- Sales Tasks Policy
CREATE POLICY "sales_tasks_RLS" ON sales_tasks FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- Sales Notes Policy
CREATE POLICY "sales_notes_RLS" ON sales_notes FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- Sales Followups Policy
CREATE POLICY "sales_followups_RLS" ON sales_followups FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- Marketing Campaigns Policy
CREATE POLICY "marketing_campaigns_RLS" ON marketing_campaigns FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- Marketing Coupons Policy
CREATE POLICY "marketing_coupons_RLS" ON marketing_coupons FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- Notifications Policy
CREATE POLICY "notifications_RLS" ON notifications FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- Payment Gateways Policy
CREATE POLICY "payment_gateways_RLS" ON payment_gateways FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
);

-- Invoice Branding Policy
CREATE POLICY "invoice_branding_RLS" ON invoice_branding FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- Export Jobs Policy
CREATE POLICY "export_jobs_RLS" ON export_jobs FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
);

-- Client Portal Queries Policy
CREATE POLICY "client_portal_queries_RLS" ON client_portal_queries FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- ─────────────────────────────────────────────────────────
-- 11. TRIGGERS
-- ─────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_reminder_settings_updated_at ON reminder_settings;
CREATE TRIGGER update_reminder_settings_updated_at BEFORE UPDATE ON reminder_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_approval_requests_updated_at ON approval_requests;
CREATE TRIGGER update_approval_requests_updated_at BEFORE UPDATE ON approval_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_sales_leads_updated_at ON sales_leads;
CREATE TRIGGER update_sales_leads_updated_at BEFORE UPDATE ON sales_leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_marketing_campaigns_updated_at ON marketing_campaigns;
CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE ON marketing_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────
-- 12. COMPOSITE PERFORMANCE INDEXES
-- ─────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_invoices_biz_status_created ON invoices(business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_biz_due_date ON invoices(business_id, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_biz_client_id ON invoices(business_id, client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_reminder_check ON invoices(status, reminder_paused, due_date);

CREATE INDEX IF NOT EXISTS idx_clients_biz_created ON clients(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_biz_invoiced ON clients(business_id, total_invoiced DESC);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_biz ON payments(business_id);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_invoice_id ON reminder_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_sent_at ON reminder_logs(sent_at);

CREATE INDEX IF NOT EXISTS idx_employees_biz ON employees(business_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_role_id ON employees(custom_role_id);

CREATE INDEX IF NOT EXISTS idx_expenses_biz_status_created ON expenses(business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_biz ON approval_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_tasks_biz_assignee ON tasks(business_id, assignee_id, status);

CREATE INDEX IF NOT EXISTS idx_sales_leads_biz_status ON sales_leads(business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_biz ON sales_pipeline(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_notes_biz ON sales_notes(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_followups_biz ON sales_followups(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_tasks_biz ON sales_tasks(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_biz ON sales_targets(business_id);

CREATE INDEX IF NOT EXISTS idx_mktg_campaigns_biz ON marketing_campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_mktg_templates_biz ON marketing_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_mktg_contacts_biz ON marketing_contacts(business_id);
CREATE INDEX IF NOT EXISTS idx_mktg_segments_biz ON marketing_segments(business_id);
CREATE INDEX IF NOT EXISTS idx_mktg_analytics_biz ON marketing_analytics(business_id);
CREATE INDEX IF NOT EXISTS idx_mktg_coupons_biz ON marketing_coupons(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_biz ON notifications(business_id);

CREATE INDEX IF NOT EXISTS idx_payment_gateways_biz ON payment_gateways(business_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_biz ON payment_webhooks(business_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_biz ON payment_receipts(business_id);
CREATE INDEX IF NOT EXISTS idx_invoice_branding_biz ON invoice_branding(business_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_biz ON export_jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_events_inv ON client_portal_events(invoice_id);

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_name ON plans(name);
CREATE INDEX IF NOT EXISTS idx_bfo_business_id ON business_feature_overrides(business_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target ON admin_activity_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_system_metrics_date ON system_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_biz_created ON activity_logs(business_id, created_at DESC);

-- ─────────────────────────────────────────────────────────
-- 13. SEED DEFAULT SAAS PLANS
-- ─────────────────────────────────────────────────────────

INSERT INTO plans (
  name, display_name, description, price_monthly, price_yearly,
  max_invoices_per_month, max_clients, max_team_members,
  feature_whatsapp, feature_email, feature_sms, feature_payment_links,
  feature_recurring, feature_pdf_invoice, feature_custom_branding,
  feature_remove_watermark, feature_reminder_auto, feature_reminder_custom,
  feature_analytics_basic, feature_analytics_advanced, feature_bulk_invoice,
  feature_csv_import, feature_api_access, feature_white_label,
  feature_team_access, feature_client_portal, feature_tally_export,
  feature_priority_support, feature_dedicated_manager, is_active, sort_order
) VALUES
('free', 'Free Starter', 'For freelancers getting started', 0, 0,
  10, 5, 1,
  FALSE, TRUE, FALSE, TRUE,
  FALSE, TRUE, FALSE,
  FALSE, FALSE, FALSE,
  TRUE, FALSE, FALSE,
  FALSE, FALSE, FALSE,
  FALSE, FALSE, FALSE,
  FALSE, FALSE, TRUE, 1),

('starter', 'Pro Business', 'For growing SMBs and agencies', 999, 9990,
  100, 50, 3,
  TRUE, TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE,
  TRUE, TRUE, FALSE,
  TRUE, FALSE, FALSE,
  TRUE, TRUE, FALSE,
  TRUE, FALSE, TRUE, 2),

('pro', 'Business Scale', 'For established businesses', 2499, 24990,
  500, 200, 10,
  TRUE, TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE,
  TRUE, FALSE, FALSE,
  TRUE, TRUE, TRUE,
  TRUE, FALSE, TRUE, 3),

('enterprise', 'Enterprise VIP', 'Unlimited power for high-volume enterprises', 5999, 59990,
  -1, -1, -1,
  TRUE, TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE, 4)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly;

-- ─────────────────────────────────────────────────────────
-- 14. FUNCTION: get_business_features()
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_business_features(p_business_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_plan plans%ROWTYPE;
  v_override business_feature_overrides%ROWTYPE;
  v_subscription subscriptions%ROWTYPE;
BEGIN
  SELECT * INTO v_subscription FROM subscriptions WHERE business_id = p_business_id;
  SELECT * INTO v_plan FROM plans WHERE name = COALESCE(v_subscription.plan_name, 'free');
  IF v_plan.id IS NULL THEN SELECT * INTO v_plan FROM plans WHERE name = 'free'; END IF;
  SELECT * INTO v_override FROM business_feature_overrides WHERE business_id = p_business_id;

  IF v_override.is_full_access = TRUE THEN
    RETURN jsonb_build_object(
      'plan', v_plan.name, 'is_full_access', TRUE, 'is_blocked', FALSE,
      'max_invoices', -1, 'max_clients', -1, 'max_team_members', -1,
      'whatsapp', TRUE, 'email', TRUE, 'sms', TRUE,
      'payment_links', TRUE, 'recurring', TRUE, 'pdf_invoice', TRUE,
      'custom_branding', TRUE, 'remove_watermark', TRUE,
      'reminder_auto', TRUE, 'reminder_custom', TRUE,
      'analytics_basic', TRUE, 'analytics_advanced', TRUE,
      'bulk_invoice', TRUE, 'csv_import', TRUE, 'api_access', TRUE,
      'white_label', TRUE, 'team_access', TRUE, 'client_portal', TRUE,
      'tally_export', TRUE, 'priority_support', TRUE, 'dedicated_manager', TRUE
    );
  END IF;

  RETURN jsonb_build_object(
    'plan', v_plan.name, 'is_full_access', FALSE,
    'is_blocked', COALESCE(v_override.is_blocked, FALSE),
    'max_invoices', COALESCE(v_override.override_max_invoices, v_plan.max_invoices_per_month),
    'max_clients', COALESCE(v_override.override_max_clients, v_plan.max_clients),
    'max_team_members', COALESCE(v_override.override_max_team_members, v_plan.max_team_members),
    'whatsapp', COALESCE(v_override.override_whatsapp, v_plan.feature_whatsapp),
    'email', COALESCE(v_override.override_email, v_plan.feature_email),
    'sms', COALESCE(v_override.override_sms, v_plan.feature_sms),
    'payment_links', COALESCE(v_override.override_payment_links, v_plan.feature_payment_links),
    'recurring', COALESCE(v_override.override_recurring, v_plan.feature_recurring),
    'pdf_invoice', COALESCE(v_override.override_pdf_invoice, v_plan.feature_pdf_invoice),
    'custom_branding', COALESCE(v_override.override_custom_branding, v_plan.feature_custom_branding),
    'remove_watermark', COALESCE(v_override.override_remove_watermark, v_plan.feature_remove_watermark),
    'reminder_auto', COALESCE(v_override.override_reminder_auto, v_plan.feature_reminder_auto),
    'reminder_custom', COALESCE(v_override.override_reminder_custom, v_plan.feature_reminder_custom),
    'analytics_basic', COALESCE(v_override.override_analytics_basic, v_plan.feature_analytics_basic),
    'analytics_advanced', COALESCE(v_override.override_analytics_advanced, v_plan.feature_analytics_advanced),
    'bulk_invoice', COALESCE(v_override.override_bulk_invoice, v_plan.feature_bulk_invoice),
    'csv_import', COALESCE(v_override.override_csv_import, v_plan.feature_csv_import),
    'api_access', COALESCE(v_override.override_api_access, v_plan.feature_api_access),
    'white_label', COALESCE(v_override.override_white_label, v_plan.feature_white_label),
    'team_access', COALESCE(v_override.override_team_access, v_plan.feature_team_access),
    'client_portal', COALESCE(v_override.override_client_portal, v_plan.feature_client_portal),
    'tally_export', COALESCE(v_override.override_tally_export, v_plan.feature_tally_export),
    'priority_support', COALESCE(v_override.override_priority_support, v_plan.feature_priority_support),
    'dedicated_manager', COALESCE(v_override.override_dedicated_manager, v_plan.feature_dedicated_manager)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
