-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- TABLE 1: businesses
-- ─────────────────────────────────────────
CREATE TABLE businesses (
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
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE 2: clients
-- ─────────────────────────────────────────
CREATE TABLE clients (
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

-- ─────────────────────────────────────────
-- TABLE 3: invoices
-- ─────────────────────────────────────────
CREATE TABLE invoices (
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

-- ─────────────────────────────────────────
-- TABLE 4: invoice_items
-- ─────────────────────────────────────────
CREATE TABLE invoice_items (
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

-- ─────────────────────────────────────────
-- TABLE 5: payments
-- ─────────────────────────────────────────
CREATE TABLE payments (
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

-- ─────────────────────────────────────────
-- TABLE 5.5: recurring_schedules
-- ─────────────────────────────────────────
CREATE TABLE recurring_schedules (
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

-- ─────────────────────────────────────────
-- TABLE 6: reminder_logs
-- ─────────────────────────────────────────
CREATE TABLE reminder_logs (
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

-- ─────────────────────────────────────────
-- TABLE 7: notification_settings
-- ─────────────────────────────────────────
CREATE TABLE notification_settings (
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

-- ─────────────────────────────────────────
-- TABLE 8: activity_logs
-- ─────────────────────────────────────────
CREATE TABLE activity_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  description   TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Businesses: users can only see their own business
CREATE POLICY "Users can view own business" ON businesses
  FOR ALL USING (auth.uid() = user_id);

-- Clients: users can only see clients of their business
CREATE POLICY "Users can manage own clients" ON clients
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Invoices: users can only see their own invoices
CREATE POLICY "Users can manage own invoices" ON invoices
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Invoice items: through invoice access
CREATE POLICY "Users can manage own invoice items" ON invoice_items
  FOR ALL USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE business_id IN (
        SELECT id FROM businesses WHERE user_id = auth.uid()
      )
    )
  );

-- Payments RLS
CREATE POLICY "Users can manage own payments" ON payments
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Allow public to insert payments (webhook)
CREATE POLICY "Service role can insert payments" ON payments
  FOR INSERT WITH CHECK (TRUE);

-- Reminder logs RLS  
CREATE POLICY "Users can view own reminder logs" ON reminder_logs
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Notification settings RLS
CREATE POLICY "Users can manage own notification settings" 
  ON notification_settings
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Activity logs RLS
CREATE POLICY "Users can view own activity" ON activity_logs
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Recurring schedules RLS
CREATE POLICY "Users can manage own recurring schedules" ON recurring_schedules
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create subscription and notification settings when business created
CREATE OR REPLACE FUNCTION create_default_business_assets()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_settings (business_id)
  VALUES (NEW.id);
  
  INSERT INTO subscriptions (business_id, plan, billing_cycle, status)
  VALUES (NEW.id, 'free', 'monthly', 'active');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_assets_on_business_create
  AFTER INSERT ON businesses
  FOR EACH ROW EXECUTE FUNCTION create_default_business_assets();

-- ─────────────────────────────────────────
-- TABLE additions for Phase 5
-- ─────────────────────────────────────────

-- 1. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  plan                 TEXT DEFAULT 'free' CHECK (plan IN ('free','solo','business','scale')),
  billing_cycle        TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  status               TEXT DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','trial')),
  razorpay_sub_id      TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_period_end   TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  trial_ends_at        TIMESTAMP WITH TIME ZONE,
  cancelled_at         TIMESTAMP WITH TIME ZONE,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Team Members Table
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

-- Alter businesses table to add invoice template configurations and customization defaults
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS default_payment_terms INTEGER DEFAULT 7;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS default_tax_rate NUMERIC DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS default_notes TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS default_terms TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS invoice_template TEXT DEFAULT 'modern';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT 'blue';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Inter';

-- Enable RLS Policies on new tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Subscriptions RLS
CREATE POLICY "Users can manage own subscription" ON subscriptions
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Team members RLS
CREATE POLICY "Owners can manage team members" ON team_members
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can view roster" ON team_members
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM team_members WHERE user_id = auth.uid()
    ) OR business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- PERFORMANCE OPTIMIZATION INDEXES
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
