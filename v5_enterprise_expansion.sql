-- ═══════════════════════════════════════════════════════════════
-- CollectBot V5 — Enterprise Modules Expansion Migration Script
-- Run this entire script in your Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════

-- 1. Payment Gateways Table
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

-- 2. Payment Webhooks Table (Idempotency & Audit)
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

-- 3. Payment Receipts Table
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

-- 4. Invoice Branding & Theme Settings Table
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

-- 5. Export Jobs & Logs Table
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

-- 6. Client Portal Events & Queries
CREATE TABLE IF NOT EXISTS client_portal_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id    UUID REFERENCES invoices(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL CHECK (event_type IN ('viewed', 'download_pdf', 'pay_click', 'payment_attempt', 'query_raised')),
  ip_address    TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- 7. RLS Policies & Indexes
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_queries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_gateways_RLS" ON payment_gateways;
DROP POLICY IF EXISTS "invoice_branding_RLS" ON invoice_branding;
DROP POLICY IF EXISTS "export_jobs_RLS" ON export_jobs;
DROP POLICY IF EXISTS "client_portal_queries_RLS" ON client_portal_queries;

CREATE POLICY "payment_gateways_RLS" ON payment_gateways FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
CREATE POLICY "invoice_branding_RLS" ON invoice_branding FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
CREATE POLICY "export_jobs_RLS" ON export_jobs FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
CREATE POLICY "client_portal_queries_RLS" ON client_portal_queries FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_payment_gateways_biz ON payment_gateways(business_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_biz ON payment_webhooks(business_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_biz ON payment_receipts(business_id);
CREATE INDEX IF NOT EXISTS idx_invoice_branding_biz ON invoice_branding(business_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_biz ON export_jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_events_inv ON client_portal_events(invoice_id);
