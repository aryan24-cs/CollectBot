-- 1. Alter employees table to add design workspace attributes
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_type TEXT DEFAULT 'FINANCE' CHECK (employee_type IN ('OWNER', 'FINANCE', 'SALES', 'MARKETING'));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS updated_by UUID;

-- 2. Create employee_profiles table 
CREATE TABLE IF NOT EXISTS employee_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE,
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  bio           TEXT,
  skills        TEXT[],
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE,
  created_by    UUID,
  updated_by    UUID,
  UNIQUE(employee_id)
);

-- 3. Create employee_login_history table
CREATE TABLE IF NOT EXISTS employee_login_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE,
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  ip_address    TEXT,
  user_agent    TEXT,
  login_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE,
  created_by    UUID,
  updated_by    UUID
);

-- 4. Create employee_activity_logs table
CREATE TABLE IF NOT EXISTS employee_activity_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE,
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description   TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE,
  created_by    UUID,
  updated_by    UUID
);

-- 5. Create sales_leads table
CREATE TABLE IF NOT EXISTS sales_leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  company       TEXT,
  source        TEXT,
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'qualified', 'contacted', 'proposal_sent', 'negotiation', 'won', 'lost')),
  value         DECIMAL(12,2) DEFAULT 0.00,
  assigned_to   UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE,
  created_by    UUID,
  updated_by    UUID
);

-- 6. Create sales_pipeline table
CREATE TABLE IF NOT EXISTS sales_pipeline (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES sales_leads(id) ON DELETE CASCADE,
  stage         TEXT NOT NULL,
  changed_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes         TEXT,
  deleted_at    TIMESTAMP WITH TIME ZONE,
  created_by    UUID,
  updated_by    UUID
);

-- 7. Create sales_notes table
CREATE TABLE IF NOT EXISTS sales_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES sales_leads(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE,
  created_by    UUID,
  updated_by    UUID
);

-- 8. Create sales_followups table
CREATE TABLE IF NOT EXISTS sales_followups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES sales_leads(id) ON DELETE CASCADE,
  type          TEXT NOT NULL, -- e.g. call, email, meeting
  scheduled_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes         TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE,
  created_by    UUID,
  updated_by    UUID
);

-- 9. Create sales_tasks table
CREATE TABLE IF NOT EXISTS sales_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES sales_leads(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  due_date      TIMESTAMP WITH TIME ZONE,
  status        TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
  assigned_to   UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE,
  created_by    UUID,
  updated_by    UUID
);

-- 10. Create sales_targets table
CREATE TABLE IF NOT EXISTS sales_targets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id     UUID REFERENCES employees(id) ON DELETE CASCADE,
  period          TEXT NOT NULL CHECK (period IN ('daily', 'monthly', 'quarterly')),
  target_amount   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  achieved_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE,
  created_by      UUID,
  updated_by      UUID
);

-- 11. Create marketing_campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('email', 'whatsapp', 'sms', 'social')),
  status        TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  subject       TEXT,
  content       TEXT NOT NULL,
  scheduled_at  TIMESTAMP WITH TIME ZONE,
  sent_at       TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE,
  created_by    UUID,
  updated_by    UUID
);

-- 12. Create marketing_templates table
CREATE TABLE IF NOT EXISTS marketing_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('email', 'whatsapp', 'sms')),
  subject       TEXT,
  body_content  TEXT NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(), 
  deleted_at    TIMESTAMP WITH TIME ZONE,
  created_by    UUID,
  updated_by    UUID
);


-- 13. Create marketing_contacts table
CREATE TABLE IF NOT EXISTS marketing_contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  status        TEXT DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'bounced')),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE,
  created_by    UUID,
  updated_by    UUID
);

-- 14. Create marketing_segments table
CREATE TABLE IF NOT EXISTS marketing_segments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  rules         JSONB DEFAULT '{}',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE,
  created_by    UUID,
  updated_by    UUID
);

-- 15. Create marketing_analytics table
CREATE TABLE IF NOT EXISTS marketing_analytics (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID REFERENCES businesses(id) ON DELETE CASCADE,
  campaign_id        UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  sent_count         INTEGER DEFAULT 0,
  delivered_count    INTEGER DEFAULT 0,
  open_count         INTEGER DEFAULT 0,
  click_count        INTEGER DEFAULT 0,
  conversion_count   INTEGER DEFAULT 0,
  roi                DECIMAL(12,2) DEFAULT 0.00,
  revenue_generated  DECIMAL(12,2) DEFAULT 0.00,
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at         TIMESTAMP WITH TIME ZONE,
  created_by         UUID,
  updated_by         UUID
);

-- 16. Create marketing_forms table
CREATE TABLE IF NOT EXISTS marketing_forms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  fields        JSONB DEFAULT '[]',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE,
  created_by    UUID,
  updated_by    UUID
);

-- 17. Create marketing_coupons table
CREATE TABLE IF NOT EXISTS marketing_coupons (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID REFERENCES businesses(id) ON DELETE CASCADE,
  code           TEXT NOT NULL,
  discount_type  TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(12,2) NOT NULL,
  expires_at     TIMESTAMP WITH TIME ZONE,
  max_uses       INTEGER DEFAULT 0,
  uses_count     INTEGER DEFAULT 0,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at     TIMESTAMP WITH TIME ZONE,
  created_by     UUID,
  updated_by     UUID
);

-- 18. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at    TIMESTAMP WITH TIME ZONE,
  created_by    UUID,
  updated_by    UUID
);

-- 19. Alter activity_logs table to add tracking fields
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS updated_by UUID;

-- 20. Indexes for Tenant Isolation
CREATE INDEX IF NOT EXISTS idx_employees_biz ON employees(business_id);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_biz ON employee_profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_employee_login_hist_biz ON employee_login_history(business_id);
CREATE INDEX IF NOT EXISTS idx_employee_act_logs_biz ON employee_activity_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_leads_biz ON sales_leads(business_id);
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
CREATE INDEX IF NOT EXISTS idx_mktg_forms_biz ON marketing_forms(business_id);
CREATE INDEX IF NOT EXISTS idx_mktg_coupons_biz ON marketing_coupons(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_biz ON notifications(business_id);
