-- ─────────────────────────────────────────────────────────
-- COLLECTBOT V2 — PERFORMANCE & SPEED COMPOSITE INDEXES
-- Zero functionality regression — High-throughput database indexes
-- ─────────────────────────────────────────────────────────

-- 1. Invoices composite performance indexes
CREATE INDEX IF NOT EXISTS idx_invoices_biz_status_created ON invoices(business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_biz_due_date ON invoices(business_id, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_biz_client_id ON invoices(business_id, client_id);

-- 2. Clients composite performance indexes
CREATE INDEX IF NOT EXISTS idx_clients_biz_created ON clients(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_biz_invoiced ON clients(business_id, total_invoiced DESC);

-- 3. Expenses performance indexes
CREATE INDEX IF NOT EXISTS idx_expenses_biz_status_created ON expenses(business_id, status, created_at DESC);

-- 4. Sales CRM performance indexes
CREATE INDEX IF NOT EXISTS idx_sales_leads_biz_status ON sales_leads(business_id, status, created_at DESC);

-- 5. Tasks performance indexes
CREATE INDEX IF NOT EXISTS idx_tasks_biz_assignee ON tasks(business_id, assignee_id, status);

-- 6. Activity logs performance indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_biz_created ON activity_logs(business_id, created_at DESC);
