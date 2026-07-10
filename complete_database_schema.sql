-- ═══════════════════════════════════════════════════════════════
-- CollectBot Unified Complete Database Schema Migration Script
-- Run this entire script in your Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
-- CORE SAAS TABLES
-- ─────────────────────────────────────────

-- TABLE 1: businesses
CREATE TABLE IF NOT EXISTS businesses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  logo_url        TEXT,
  email           TEXT,
  phone           TEXT,
  address         TEXT,
  city            TEXT,
  state           TEXT,
  pincode         TEXT,
  gstin           TEXT,
  pan             TEXT,
  bank_name       TEXT,
  account_number  TEXT,
  ifsc_code       TEXT,
  upi_id          TEXT,
  currency        TEXT DEFAULT 'INR',
  timezone        TEXT DEFAULT 'Asia/Kolkata',
  whatsapp_number TEXT,
  invoice_prefix  TEXT DEFAULT 'INV',
  invoice_counter INTEGER DEFAULT 1,
  default_payment_terms INTEGER DEFAULT 7,
  default_tax_rate NUMERIC DEFAULT 0,
  default_notes TEXT,
  default_terms TEXT,
  invoice_template TEXT DEFAULT 'modern',
  primary_color TEXT DEFAULT 'blue',
  font_family TEXT DEFAULT 'Inter',
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 2: clients
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

-- TABLE 3: invoices
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

-- TABLE 4: invoice_items
CREATE TABLE IF NOT EXISTS invoice_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  quantity      NUMERIC NOT NULL DEFAULT 1,
  rate          NUMERIC NOT NULL DEFAULT 0,
  amount        NUMERIC NOT NULL DEFAULT 0,
  tax_rate      NUMERIC DEFAULT 0,
  tax_amount    NUMERIC DEFAULT 0,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 5: payments
CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID REFERENCES invoices(id) ON DELETE CASCADE,
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  amount          NUMERIC NOT NULL,
  payment_method  TEXT DEFAULT 'online'
                  CHECK (payment_method IN (
                    'upi','card','netbanking',
                    'wallet','manual','online'
                  )),
  razorpay_id     TEXT UNIQUE,
  razorpay_order_id TEXT,
  status          TEXT DEFAULT 'pending'
                  CHECK (status IN (
                    'pending','success','failed','refunded'
                  )),
  paid_at         TIMESTAMP WITH TIME ZONE,
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 6: recurring_schedules
CREATE TABLE IF NOT EXISTS recurring_schedules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID REFERENCES businesses(id) ON DELETE CASCADE,
  client_id           UUID REFERENCES clients(id) ON DELETE CASCADE,
  frequency           TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_invoice_date   DATE NOT NULL,
  end_date            DATE,
  template_data       JSONB NOT NULL,
  is_active           BOOLEAN DEFAULT TRUE,
  invoice_id          UUID REFERENCES invoices(id) ON DELETE CASCADE,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 7: reminder_logs
CREATE TABLE IF NOT EXISTS reminder_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID REFERENCES invoices(id) ON DELETE CASCADE,
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  reminder_type   TEXT NOT NULL
                  CHECK (reminder_type IN (
                    '7_before','3_before','1_before',
                    'due_day','1_after','3_after',
                    '7_after','14_after',
                    'invoice_sent','manual'
                  )),
  channel         TEXT NOT NULL
                  CHECK (channel IN ('whatsapp','email','sms')),
  status          TEXT DEFAULT 'sent'
                  CHECK (status IN ('sent','delivered','failed')),
  message_content TEXT,
  error_message   TEXT,
  sent_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 8: notification_settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID REFERENCES businesses(id) 
                        ON DELETE CASCADE UNIQUE,
  reminder_7_before     BOOLEAN DEFAULT TRUE,
  reminder_3_before     BOOLEAN DEFAULT FALSE,
  reminder_1_before     BOOLEAN DEFAULT TRUE,
  reminder_due_day      BOOLEAN DEFAULT TRUE,
  reminder_1_after      BOOLEAN DEFAULT FALSE,
  reminder_3_after      BOOLEAN DEFAULT TRUE,
  reminder_7_after      BOOLEAN DEFAULT TRUE,
  reminder_14_after     BOOLEAN DEFAULT TRUE,
  channel_whatsapp      BOOLEAN DEFAULT TRUE,
  channel_email         BOOLEAN DEFAULT TRUE,
  quiet_hours_start     TIME DEFAULT '09:00',
  quiet_hours_end       TIME DEFAULT '20:00',
  owner_payment_alert   BOOLEAN DEFAULT TRUE,
  owner_daily_summary   BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 9: activity_logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  description   TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 10: team_members
CREATE TABLE IF NOT EXISTS team_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email       TEXT NOT NULL,
  role        TEXT DEFAULT 'viewer' CHECK (role IN ('owner','manager','viewer')),
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','active')),
  invited_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at   TIMESTAMP WITH TIME ZONE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- SUPER ADMIN SYSTEM TABLES
-- ─────────────────────────────────────────────────────────

-- TABLE 11: admin_users
CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  role          TEXT DEFAULT 'admin'
                CHECK (role IN ('super_admin', 'admin', 'support')),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login    TIMESTAMP WITH TIME ZONE
);

-- TABLE 12: plans
CREATE TABLE IF NOT EXISTS plans (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL UNIQUE,
  display_name              TEXT NOT NULL,
  price_monthly             NUMERIC DEFAULT 0,
  price_yearly              NUMERIC DEFAULT 0,
  is_active                 BOOLEAN DEFAULT TRUE,
  is_public                 BOOLEAN DEFAULT TRUE,
  sort_order                INTEGER DEFAULT 0,
  max_invoices_per_month    INTEGER DEFAULT 5,
  max_clients               INTEGER DEFAULT 1,
  max_team_members          INTEGER DEFAULT 1,
  feature_whatsapp          BOOLEAN DEFAULT FALSE,
  feature_email             BOOLEAN DEFAULT TRUE,
  feature_sms               BOOLEAN DEFAULT FALSE,
  feature_payment_links     BOOLEAN DEFAULT FALSE,
  feature_recurring         BOOLEAN DEFAULT FALSE,
  feature_pdf_invoice       BOOLEAN DEFAULT TRUE,
  feature_custom_branding   BOOLEAN DEFAULT FALSE,
  feature_remove_watermark  BOOLEAN DEFAULT FALSE,
  feature_reminder_auto     BOOLEAN DEFAULT FALSE,
  feature_reminder_custom   BOOLEAN DEFAULT FALSE,
  feature_analytics_basic   BOOLEAN DEFAULT TRUE,
  feature_analytics_advanced BOOLEAN DEFAULT FALSE,
  feature_bulk_invoice      BOOLEAN DEFAULT FALSE,
  feature_csv_import        BOOLEAN DEFAULT FALSE,
  feature_api_access        BOOLEAN DEFAULT FALSE,
  feature_white_label       BOOLEAN DEFAULT FALSE,
  feature_team_access       BOOLEAN DEFAULT FALSE,
  feature_client_portal     BOOLEAN DEFAULT FALSE,
  feature_tally_export      BOOLEAN DEFAULT FALSE,
  feature_priority_support  BOOLEAN DEFAULT FALSE,
  feature_dedicated_manager BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 13: subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  plan_id              UUID REFERENCES plans(id),
  plan_name            TEXT DEFAULT 'free',
  plan                 TEXT DEFAULT 'free' CHECK (plan IN ('free','solo','business','scale')),
  billing_cycle        TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly','lifetime','trial')),
  status               TEXT DEFAULT 'active' CHECK (status IN ('active','trialing','cancelled','expired','paused','past_due','trial')),
  razorpay_sub_id      TEXT,
  razorpay_customer_id  TEXT,
  amount_paid_total     NUMERIC DEFAULT 0,
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_period_end   TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  trial_ends_at        TIMESTAMP WITH TIME ZONE,
  cancelled_at         TIMESTAMP WITH TIME ZONE,
  cancellation_reason   TEXT,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 14: business_feature_overrides
CREATE TABLE IF NOT EXISTS business_feature_overrides (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id                 UUID REFERENCES businesses(id) 
                              ON DELETE CASCADE UNIQUE,
  override_whatsapp           BOOLEAN DEFAULT NULL,
  override_email              BOOLEAN DEFAULT NULL,
  override_sms                BOOLEAN DEFAULT NULL,
  override_payment_links      BOOLEAN DEFAULT NULL,
  override_recurring          BOOLEAN DEFAULT NULL,
  override_pdf_invoice        BOOLEAN DEFAULT NULL,
  override_custom_branding    BOOLEAN DEFAULT NULL,
  override_remove_watermark   BOOLEAN DEFAULT NULL,
  override_reminder_auto      BOOLEAN DEFAULT NULL,
  override_reminder_custom    BOOLEAN DEFAULT NULL,
  override_analytics_basic    BOOLEAN DEFAULT NULL,
  override_analytics_advanced BOOLEAN DEFAULT NULL,
  override_bulk_invoice       BOOLEAN DEFAULT NULL,
  override_csv_import         BOOLEAN DEFAULT NULL,
  override_api_access         BOOLEAN DEFAULT NULL,
  override_white_label        BOOLEAN DEFAULT NULL,
  override_team_access        BOOLEAN DEFAULT NULL,
  override_client_portal      BOOLEAN DEFAULT NULL,
  override_tally_export       BOOLEAN DEFAULT NULL,
  override_priority_support   BOOLEAN DEFAULT NULL,
  override_dedicated_manager  BOOLEAN DEFAULT NULL,
  override_max_invoices       INTEGER DEFAULT NULL,
  override_max_clients        INTEGER DEFAULT NULL,
  override_max_team_members   INTEGER DEFAULT NULL,
  is_full_access              BOOLEAN DEFAULT FALSE,
  is_beta_tester              BOOLEAN DEFAULT FALSE,
  is_blocked                  BOOLEAN DEFAULT FALSE,
  admin_notes                 TEXT,
  overridden_by               UUID REFERENCES admin_users(id),
  overridden_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 15: admin_activity_logs
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID REFERENCES admin_users(id),
  action          TEXT NOT NULL,
  target_type     TEXT,
  target_id       TEXT,
  description     TEXT NOT NULL,
  old_value       JSONB,
  new_value       JSONB,
  ip_address      TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 16: system_metrics
CREATE TABLE IF NOT EXISTS system_metrics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date                  DATE UNIQUE DEFAULT CURRENT_DATE,
  total_businesses      INTEGER DEFAULT 0,
  new_businesses_today  INTEGER DEFAULT 0,
  active_businesses     INTEGER DEFAULT 0,
  total_invoices        INTEGER DEFAULT 0,
  invoices_today        INTEGER DEFAULT 0,
  total_payments        INTEGER DEFAULT 0,
  payments_today        INTEGER DEFAULT 0,
  total_revenue         NUMERIC DEFAULT 0,
  revenue_today         NUMERIC DEFAULT 0,
  whatsapp_sent_today   INTEGER DEFAULT 0,
  emails_sent_today     INTEGER DEFAULT 0,
  free_plan_count       INTEGER DEFAULT 0,
  solo_plan_count       INTEGER DEFAULT 0,
  business_plan_count   INTEGER DEFAULT 0,
  scale_plan_count      INTEGER DEFAULT 0,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist before creating
DROP POLICY IF EXISTS "businesses_RLS" ON businesses;
DROP POLICY IF EXISTS "clients_RLS" ON clients;
DROP POLICY IF EXISTS "invoices_RLS" ON invoices;
DROP POLICY IF EXISTS "invoice_items_RLS" ON invoice_items;
DROP POLICY IF EXISTS "payments_manage" ON payments;
DROP POLICY IF EXISTS "payments_webhook_insert" ON payments;
DROP POLICY IF EXISTS "reminder_logs_RLS" ON reminder_logs;
DROP POLICY IF EXISTS "notifications_RLS" ON notification_settings;
DROP POLICY IF EXISTS "activity_logs_RLS" ON activity_logs;
DROP POLICY IF EXISTS "recurring_schedules_RLS" ON recurring_schedules;
DROP POLICY IF EXISTS "subscriptions_RLS" ON subscriptions;
DROP POLICY IF EXISTS "team_members_owner" ON team_members;
DROP POLICY IF EXISTS "team_members_view" ON team_members;
DROP POLICY IF EXISTS "admin_users_admin_only" ON admin_users;
DROP POLICY IF EXISTS "plans_read_authenticated" ON plans;
DROP POLICY IF EXISTS "plans_admin_modify" ON plans;
DROP POLICY IF EXISTS "overrides_admin_only" ON business_feature_overrides;
DROP POLICY IF EXISTS "admin_logs_admin_only" ON admin_activity_logs;
DROP POLICY IF EXISTS "system_metrics_admin_only" ON system_metrics;

-- Core Policies
CREATE POLICY "businesses_RLS" ON businesses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "clients_RLS" ON clients FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
CREATE POLICY "invoices_RLS" ON invoices FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
CREATE POLICY "invoice_items_RLS" ON invoice_items FOR ALL USING (invoice_id IN (SELECT id FROM invoices WHERE business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())));
CREATE POLICY "payments_manage" ON payments FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
CREATE POLICY "payments_webhook_insert" ON payments FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "reminder_logs_RLS" ON reminder_logs FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
CREATE POLICY "notifications_RLS" ON notification_settings FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
CREATE POLICY "activity_logs_RLS" ON activity_logs FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
CREATE POLICY "recurring_schedules_RLS" ON recurring_schedules FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
CREATE POLICY "subscriptions_RLS" ON subscriptions FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
CREATE POLICY "team_members_owner" ON team_members FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
CREATE POLICY "team_members_view" ON team_members FOR SELECT USING (business_id IN (SELECT business_id FROM team_members WHERE user_id = auth.uid()) OR business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- Admin Panel Policies (Admin restricted)
CREATE POLICY "admin_users_admin_only" ON admin_users FOR ALL USING (auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = TRUE));
CREATE POLICY "plans_read_authenticated" ON plans FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "plans_admin_modify" ON plans FOR ALL USING (auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = TRUE));
CREATE POLICY "overrides_admin_only" ON business_feature_overrides FOR ALL USING (auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = TRUE));
CREATE POLICY "admin_logs_admin_only" ON admin_activity_logs FOR ALL USING (auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = TRUE));
CREATE POLICY "system_metrics_admin_only" ON system_metrics FOR ALL USING (auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = TRUE));


-- ─────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers before creating
DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
DROP TRIGGER IF EXISTS create_assets_on_business_create ON businesses;

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger function to auto-create default assets on business signup
CREATE OR REPLACE FUNCTION create_default_business_assets()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_settings (business_id) VALUES (NEW.id);
  INSERT INTO subscriptions (business_id, plan, plan_name, billing_cycle, status) VALUES (NEW.id, 'free', 'free', 'monthly', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_assets_on_business_create AFTER INSERT ON businesses FOR EACH ROW EXECUTE FUNCTION create_default_business_assets();


-- ─────────────────────────────────────────
-- SEED DEFAULT DATA
-- ─────────────────────────────────────────

-- Insert Plans
INSERT INTO plans (
  name, display_name, price_monthly, price_yearly,
  sort_order, max_invoices_per_month, max_clients, max_team_members,
  feature_whatsapp, feature_email, feature_sms,
  feature_payment_links, feature_recurring, feature_pdf_invoice,
  feature_custom_branding, feature_remove_watermark,
  feature_reminder_auto, feature_reminder_custom,
  feature_analytics_basic, feature_analytics_advanced,
  feature_bulk_invoice, feature_csv_import, feature_api_access,
  feature_white_label, feature_team_access, feature_client_portal,
  feature_tally_export, feature_priority_support, feature_dedicated_manager
) VALUES
('free', 'Free', 0, 0, 1, 5, 1, 1,
  FALSE, TRUE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE,
  FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, FALSE,
  FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('solo', 'Solo', 799, 7999, 2, 30, -1, 1,
  TRUE, TRUE, FALSE, TRUE, FALSE, TRUE, TRUE, TRUE,
  TRUE, FALSE, TRUE, FALSE, FALSE, FALSE, FALSE,
  FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('business', 'Business', 2499, 24999, 3, -1, -1, 3,
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, FALSE,
  FALSE, TRUE, FALSE, FALSE, TRUE, FALSE),
('scale', 'Scale', 3999, 39999, 4, -1, -1, 5,
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (name) DO NOTHING;


-- ─────────────────────────────────────────
-- INDEXES FOR PERFORMANCE
-- ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_business_id ON clients(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_invoice_id ON reminder_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_sent_at ON reminder_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_invoices_reminder_check ON invoices(status, reminder_paused, due_date);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_name ON plans(name);
CREATE INDEX IF NOT EXISTS idx_bfo_business_id ON business_feature_overrides(business_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target ON admin_activity_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_system_metrics_date ON system_metrics(date DESC);


-- ─────────────────────────────────────────
-- FUNCTION: get_business_features()
-- ─────────────────────────────────────────
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
