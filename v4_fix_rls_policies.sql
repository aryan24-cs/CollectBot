-- ═══════════════════════════════════════════════════════════════
-- CollectBot V4 — Complete RLS Policies & Helper Functions
-- Run this in the Supabase SQL Editor to grant proper permissions
-- ═══════════════════════════════════════════════════════════════

-- 1. Helper function for RLS without recursion
CREATE OR REPLACE FUNCTION get_employee_business_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM employees WHERE user_id = p_user_id AND status = 'active';
$$;

-- 2. Enable RLS on all V3 expansion tables
ALTER TABLE IF EXISTS employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employee_login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employee_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS marketing_contacts ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing non-helper policies to re-apply cleanly
DROP POLICY IF EXISTS "employees_RLS" ON employees;
DROP POLICY IF EXISTS "departments_RLS" ON departments;
DROP POLICY IF EXISTS "custom_roles_RLS" ON custom_roles;
DROP POLICY IF EXISTS "expenses_RLS" ON expenses;
DROP POLICY IF EXISTS "tasks_RLS" ON tasks;
DROP POLICY IF EXISTS "approval_requests_RLS" ON approval_requests;
DROP POLICY IF EXISTS "notifications_RLS_v4" ON notifications;

-- 4. Re-create non-recursive policies for employees and workspace modules
CREATE POLICY "employees_RLS" ON employees FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

CREATE POLICY "departments_RLS" ON departments FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

CREATE POLICY "custom_roles_RLS" ON custom_roles FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

CREATE POLICY "expenses_RLS" ON expenses FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

CREATE POLICY "tasks_RLS" ON tasks FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

CREATE POLICY "approval_requests_RLS" ON approval_requests FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

CREATE POLICY "notifications_RLS_v4" ON notifications FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);
