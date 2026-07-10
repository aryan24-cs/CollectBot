-- ═══════════════════════════════════════════════════════════════
-- CollectBot Super Admin Dashboard — Database Migration
-- Run this entire file in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- TABLE 1: admin_users
-- Only people in this table can access admin dashboard
-- ─────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────
-- TABLE 2: plans
-- Master plan definitions — admin controls this
-- ─────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────
-- TABLE 3: business_feature_overrides
-- Per-business manual overrides by admin
-- ─────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────
-- TABLE 4: subscriptions (enhance existing)
-- ─────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'plan_id') THEN
    ALTER TABLE subscriptions ADD COLUMN plan_id UUID REFERENCES plans(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'plan_name') THEN
    ALTER TABLE subscriptions ADD COLUMN plan_name TEXT DEFAULT 'free';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'trial_ends_at') THEN
    ALTER TABLE subscriptions ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'current_period_start') THEN
    ALTER TABLE subscriptions ADD COLUMN current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'current_period_end') THEN
    ALTER TABLE subscriptions ADD COLUMN current_period_end TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'razorpay_sub_id') THEN
    ALTER TABLE subscriptions ADD COLUMN razorpay_sub_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'razorpay_customer_id') THEN
    ALTER TABLE subscriptions ADD COLUMN razorpay_customer_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'amount_paid_total') THEN
    ALTER TABLE subscriptions ADD COLUMN amount_paid_total NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'cancelled_at') THEN
    ALTER TABLE subscriptions ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'cancellation_reason') THEN
    ALTER TABLE subscriptions ADD COLUMN cancellation_reason TEXT;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────
-- TABLE 5: admin_activity_logs
-- ─────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────
-- TABLE 6: system_metrics (daily snapshots)
-- ─────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────
-- INSERT DEFAULT PLANS
-- ─────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────
-- FUNCTION: Get effective features for a business
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

-- ─────────────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────────────
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_users_admin_only" ON admin_users FOR ALL
    USING (auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = TRUE));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "plans_read_authenticated" ON plans FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "plans_admin_modify" ON plans FOR ALL
    USING (auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = TRUE));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "overrides_admin_only" ON business_feature_overrides FOR ALL
    USING (auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = TRUE));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_logs_admin_only" ON admin_activity_logs FOR ALL
    USING (auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = TRUE));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "system_metrics_admin_only" ON system_metrics FOR ALL
    USING (auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = TRUE));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_name ON plans(name);
CREATE INDEX IF NOT EXISTS idx_bfo_business_id ON business_feature_overrides(business_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target ON admin_activity_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_system_metrics_date ON system_metrics(date DESC);

-- ─────────────────────────────────────────────────────────
-- DONE! Insert yourself as super admin:
-- INSERT INTO admin_users (user_id, email, name, role)
-- VALUES ('YOUR-UUID', 'your@email.com', 'Your Name', 'super_admin');
-- ─────────────────────────────────────────────────────────
