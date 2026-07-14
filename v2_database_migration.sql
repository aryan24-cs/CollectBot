-- ═══════════════════════════════════════════════════════════════
-- CollectBot V2: Enterprise Database Migration Script
-- Run this entire script in your Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════

-- 1. Create branches
CREATE TABLE IF NOT EXISTS branches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  location      TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create departments
CREATE TABLE IF NOT EXISTS departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create custom_roles
CREATE TABLE IF NOT EXISTS custom_roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (business_id, name)
);

-- 4. Create role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       UUID REFERENCES custom_roles(id) ON DELETE CASCADE,
  category      TEXT NOT NULL CHECK (category IN ('invoices', 'clients', 'payments', 'reports', 'analytics', 'finance', 'marketing', 'sales', 'employees', 'settings', 'approvals', 'expenses', 'branches')),
  action        TEXT NOT NULL CHECK (action IN ('view', 'create', 'edit', 'delete', 'approve', 'export', 'share', 'assign')),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, category, action)
);

-- 5. Create employees (extending team_members concept)
CREATE TABLE IF NOT EXISTS employees (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id            UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  department_id          UUID REFERENCES departments(id) ON DELETE SET NULL,
  custom_role_id         UUID REFERENCES custom_roles(id) ON DELETE SET NULL,
  employee_id_code       TEXT,
  name                   TEXT NOT NULL,
  email                  TEXT NOT NULL,
  phone                  TEXT,
  status                 TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  branch_id              UUID REFERENCES branches(id) ON DELETE SET NULL,
  timezone               TEXT DEFAULT 'Asia/Kolkata',
  language               TEXT DEFAULT 'en',
  invited_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at              TIMESTAMP WITH TIME ZONE,
  last_active            TIMESTAMP WITH TIME ZONE,
  activity_score         INTEGER DEFAULT 100,
  created_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, email)
);

-- 6. Create employee_permissions
CREATE TABLE IF NOT EXISTS employee_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE,
  category      TEXT NOT NULL CHECK (category IN ('invoices', 'clients', 'payments', 'reports', 'analytics', 'finance', 'marketing', 'sales', 'employees', 'settings', 'approvals', 'expenses', 'branches')),
  action        TEXT NOT NULL CHECK (action IN ('view', 'create', 'edit', 'delete', 'approve', 'export', 'share', 'assign')),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, category, action)
);

-- 7. Create employee_sessions
CREATE TABLE IF NOT EXISTS employee_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE,
  device_info   TEXT,
  ip_address    TEXT,
  logged_in_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  details       TEXT,
  ip_address    TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Create expenses
CREATE TABLE IF NOT EXISTS expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
  category      TEXT NOT NULL,
  amount        NUMERIC NOT NULL,
  date          DATE NOT NULL,
  description   TEXT,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by   UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Create approval_requests
CREATE TABLE IF NOT EXISTS approval_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  requester_id  UUID REFERENCES employees(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('invoice', 'expense', 'employee_status', 'refund')),
  target_id     UUID NOT NULL,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Create approval_steps
CREATE TABLE IF NOT EXISTS approval_steps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,
  approver_id         UUID REFERENCES employees(id) ON DELETE CASCADE,
  step_order          INTEGER DEFAULT 1,
  status              TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comment             TEXT,
  decided_at          TIMESTAMP WITH TIME ZONE
);

-- 12. Create internal_notifications
CREATE TABLE IF NOT EXISTS internal_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Create tasks
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

-- 14. Create comments
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
-- ROW LEVEL SECURITY (RLS) POLICIES ON NEW TABLES
-- ─────────────────────────────────────────────────────────

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Branches policy
CREATE POLICY "branches_RLS" ON branches FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()) OR
  business_id IN (SELECT business_id FROM employees WHERE user_id = auth.uid())
);

-- Departments policy
CREATE POLICY "departments_RLS" ON departments FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()) OR
  business_id IN (SELECT business_id FROM employees WHERE user_id = auth.uid())
);

-- Custom Roles policy
CREATE POLICY "custom_roles_RLS" ON custom_roles FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()) OR
  business_id IN (SELECT business_id FROM employees WHERE user_id = auth.uid())
);

-- Role Permissions policy
CREATE POLICY "role_permissions_RLS" ON role_permissions FOR ALL USING (
  role_id IN (SELECT id FROM custom_roles WHERE business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())) OR
  role_id IN (SELECT id FROM custom_roles WHERE business_id IN (SELECT business_id FROM employees WHERE user_id = auth.uid()))
);

-- Employees policy
CREATE POLICY "employees_RLS" ON employees FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()) OR
  business_id IN (SELECT business_id FROM employees WHERE user_id = auth.uid())
);

-- Employee Permissions policy
CREATE POLICY "employee_permissions_RLS" ON employee_permissions FOR ALL USING (
  employee_id IN (SELECT id FROM employees WHERE business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())) OR
  employee_id IN (SELECT id FROM employees WHERE business_id IN (SELECT business_id FROM employees WHERE user_id = auth.uid()))
);

-- Employee Sessions policy
CREATE POLICY "employee_sessions_RLS" ON employee_sessions FOR ALL USING (
  employee_id IN (SELECT id FROM employees WHERE business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())) OR
  employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
);

-- Audit Logs policy
CREATE POLICY "audit_logs_RLS" ON audit_logs FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()) OR
  business_id IN (SELECT business_id FROM employees WHERE user_id = auth.uid())
);

-- Expenses policy
CREATE POLICY "expenses_RLS" ON expenses FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()) OR
  business_id IN (SELECT business_id FROM employees WHERE user_id = auth.uid())
);

-- Approval Requests policy
CREATE POLICY "approval_requests_RLS" ON approval_requests FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()) OR
  business_id IN (SELECT business_id FROM employees WHERE user_id = auth.uid())
);

-- Approval Steps policy
CREATE POLICY "approval_steps_RLS" ON approval_steps FOR ALL USING (
  approval_request_id IN (SELECT id FROM approval_requests WHERE business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())) OR
  approval_request_id IN (SELECT id FROM approval_requests WHERE business_id IN (SELECT business_id FROM employees WHERE user_id = auth.uid()))
);

-- Internal Notifications policy
CREATE POLICY "internal_notifications_RLS" ON internal_notifications FOR ALL USING (
  employee_id IN (SELECT id FROM employees WHERE business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())) OR
  employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
);

-- Tasks policy
CREATE POLICY "tasks_RLS" ON tasks FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()) OR
  business_id IN (SELECT business_id FROM employees WHERE user_id = auth.uid())
);

-- Comments policy
CREATE POLICY "comments_RLS" ON comments FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()) OR
  business_id IN (SELECT business_id FROM employees WHERE user_id = auth.uid())
);

-- ─────────────────────────────────────────────────────────
-- TRIGGERS & PROCEDURES
-- ─────────────────────────────────────────────────────────

-- Trigger for updating updated_at columns
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_custom_roles_updated_at BEFORE UPDATE ON custom_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_approval_requests_updated_at BEFORE UPDATE ON approval_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────
-- INDEXES FOR V2 TABLES
-- ─────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_branches_business_id ON branches(business_id);
CREATE INDEX IF NOT EXISTS idx_departments_business_id ON departments(business_id);
CREATE INDEX IF NOT EXISTS idx_custom_roles_business_id ON custom_roles(business_id);
CREATE INDEX IF NOT EXISTS idx_employees_business_id ON employees(business_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_role_id ON employees(custom_role_id);
CREATE INDEX IF NOT EXISTS idx_expenses_business_id ON expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_business_id ON approval_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_tasks_business_id ON tasks(business_id);

-- ─────────────────────────────────────────────────────────
-- DATA MIGRATION: SYNC team_members TO employees
-- ─────────────────────────────────────────────────────────

INSERT INTO employees (id, business_id, user_id, name, email, status, invited_at, joined_at, created_at, updated_at)
SELECT 
  id, 
  business_id, 
  user_id, 
  COALESCE(split_part(email, '@', 1), 'Employee'), 
  email, 
  status, 
  invited_at, 
  joined_at, 
  created_at, 
  updated_at
FROM team_members
ON CONFLICT (business_id, email) DO NOTHING;
